"use server";

import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { getPullRequestDiff } from "@/modules/github/lib/github";

export async function reviewPullRequest(
	owner: string,
	repo: string,
	prNumber: number
) {
	try {
		const respository = await prisma.repository.findFirst({
			where: {
				owner,
				name: repo,
			},
			include: {
				user: {
					include: {
						accounts: {
							where: {
								providerId: "github",
							},
						},
					},
				},
			},
		});

		if (!respository) {
			throw new Error(
				`Repository ${owner}/${repo} not found in database. Please reconnect the repository.`
			);
		}

		const githubAccount = respository.user.accounts[0];

		if (!githubAccount?.accessToken) {
			throw new Error(
				`No GitHub access token found for repository owner.`
			);
		}

		const token = githubAccount.accessToken;

		await inngest.send({
			name: "pr.review.requested",
			data: {
				owner,
				repo,
				prNumber,
				userId: respository.user.id,
			},
		});

		return { success: true, message: "Review Queued" };
	} catch (error) {
		try {
			const repository = await prisma.repository.findFirst({
				where: {
					owner,
					name: repo,
				},
			});

			if (repository) {
				await prisma.review.create({
					data: {
						repositoryId: repository.id,
						prNumber,
						prTitle: "Failed to fetch PR",
						prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
						review: `Error: ${
							error instanceof Error
								? error.message
								: "Unknown Error"
						}`,
						status: "failed",
					},
				});
			}
		} catch (dbError) {
			console.error("Failed to save error to database:", dbError);
		}
	}
}
