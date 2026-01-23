"use server";

import {
	createWebhook,
	fetchUserContribution,
	getGithubAccessToken,
} from "@/modules/github/lib/github";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import {
	canConnectRepository,
	incrementRepositoryCount,
} from "@/modules/payment/lib/subscription";

import { Octokit } from "octokit";
import { headers } from "next/headers";
import { inngest } from "@/inngest/client";

/**
 * Fetches aggregated dashboard metrics (commits, pull requests, reviews, repositories) for the authenticated user.
 *
 * @returns An object containing:
 * - `totalCommits` — total contributions (commits) from the user's GitHub contribution calendar.
 * - `totalPrs` — total number of pull requests authored by the user.
 * - `totalReviews` — total number of reviews in the local database for repositories owned by the user.
 * - `totalRepos` — total number of repositories owned by the user in the local database.
 */
export async function getDashboardStats() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			throw new Error("Unauthorized");
		}

		const token = await getGithubAccessToken();
		const octokit = new Octokit({ auth: token });

		// Get users github username
		const { data: user } = await octokit.rest.users.getAuthenticated();

		const [totalRepos, calender, prs, totalReviews] = await Promise.all([
			prisma.repository.count({
				where: {
					userId: session.user.id,
				},
			}),
			fetchUserContribution(token, user.login),
			octokit.rest.search.issuesAndPullRequests({
				q: `author:${user.login} type:pr`,
				per_page: 1,
			}),
			prisma.review.count({
				where: {
					repository: {
						userId: session.user.id,
					},
				},
			}),
		]);

		const totalCommits = calender?.totalContributions || 0;
		const totalPrs = prs.data.total_count || 0;

		return {
			totalCommits,
			totalPrs,
			totalReviews,
			totalRepos,
		};
	} catch (error) {
		console.error("Error fetching dashboard stats:", error);
		return {
			totalCommits: 0,
			totalPrs: 0,
			totalReviews: 0,
			totalRepos: 0,
		};
	}
}

/**
 * Produces an array of monthly activity summaries for the last six months.
 *
 * Aggregates commit counts from the user's GitHub contribution calendar and counts PRs and review events in the local database, grouped by month.
 *
 * @returns An array of objects for each of the last six months in chronological order with properties: `name` (month abbreviation), `commits` (number), `prs` (number), and `reviews` (number).
 * @throws Error if the user session is missing ("Unauthorized").
 */
export async function getMonthlyActivity() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			throw new Error("Unauthorized");
		}

		const token = await getGithubAccessToken();
		const octokit = new Octokit({ auth: token });

		// Get users github username
		const { data: user } = await octokit.rest.users.getAuthenticated();

		const calender = await fetchUserContribution(token, user.login);

		if (!calender) {
			return [];
		}

		const monthlyData: {
			[key: string]: {
				commits: number;
				prs: number;
				reviews: number;
			};
		} = {};

		const monthNames = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		];

		// Initialize the last 6 months
		const now = new Date();
		for (let i = 5; i >= 0; i--) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthKey = monthNames[date.getMonth()];
			monthlyData[monthKey] = {
				commits: 0,
				prs: 0,
				reviews: 0,
			};
		}

		calender.weeks.forEach((week: any) => {
			week.contributionDays.forEach((day: any) => {
				const date = new Date(day.date);
				const monthKey = monthNames[date.getMonth()];
				if (monthlyData[monthKey]) {
					monthlyData[monthKey].commits += day.contributionCount;
				}
			});
		});

		// Fetch reviews from database for last 6 months
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		const [reviews, { data: prs }] = await Promise.all([
			prisma.review.findMany({
				where: {
					repository: {
						userId: session.user.id,
					},
					createdAt: {
						gte: sixMonthsAgo,
					},
				},
				select: {
					createdAt: true,
				},
			}),
			octokit.rest.search.issuesAndPullRequests({
				q: `author:${user.login} type:pr created:>${
					sixMonthsAgo.toISOString().split("T")[0]
				}`,
				per_page: 100,
			}),
		]);

		reviews.forEach((review) => {
			const monthKey = monthNames[review.createdAt.getMonth()];
			if (monthlyData[monthKey]) {
				monthlyData[monthKey].reviews += 1;
			}
		});

		prs.items.forEach((pr: any) => {
			const date = new Date(pr.created_at);
			const monthKey = monthNames[date.getMonth()];
			if (monthlyData[monthKey]) {
				monthlyData[monthKey].prs += 1;
			}
		});

		return Object.keys(monthlyData).map((name) => ({
			name,
			...monthlyData[name],
		}));
	} catch (error) {
		console.error("Error fetching monthly activity:", error);
		return [];
	}
}

export async function getContributionStats() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			throw new Error("Unauthorized");
		}

		const token = await getGithubAccessToken();
		const octokit = new Octokit({ auth: token });

		// Get the actual GitHub username from GitHub API
		const { data: user } = await octokit.rest.users.getAuthenticated();
		const username = user.login;

		const calender = await fetchUserContribution(token, username);

		if (!calender) {
			return null;
		}

		const contributions = calender.weeks.flatMap((week: any) =>
			week.contributionDays.map((day: any) => ({
				date: day.date,
				count: day.contributionCount,
				level: Math.min(4, Math.floor(day.contributionCount / 3)),
			}))
		);

		return {
			contributions,
			totalContributions: calender.totalContributions,
		};
	} catch (error) {
		console.error("Error fetching contribution stats:", error);
		return null;
	}
}

export async function connectRepository(
	owner: string,
	repo: string,
	githubId: number
) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		throw new Error("Unauthorized");
	}

	const canConnect = await canConnectRepository(session.user.id);

	if (!canConnect) {
		throw new Error(
			"Repository limit reached. Please upgrade to PRO for unlimited repositories."
		);
	}

	const webhook = await createWebhook(owner, repo);

	if (webhook) {
		await prisma.repository.create({
			data: {
				githubId: BigInt(githubId),
				name: repo,
				owner,
				fullName: `${owner}/${repo}`,
				url: `https://github.com/${owner}/${repo}`,
				userId: session.user.id,
			},
		});

		await incrementRepositoryCount(session.user.id);

		try {
			await inngest.send({
				name: "repository.connected",
				data: {
					owner,
					repo,
					userId: session.user.id,
				},
			});
		} catch (error) {
			console.error("Failed to trigger repository indexing:", error);
		}
	}

	return webhook;
}