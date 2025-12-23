import { reviewPullRequest } from "@/modules/ai/actions";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const event = request.headers.get("x-github-event");

		console.log(`Received GitHub event: ${event}`);

		if (event === "ping") {
			return NextResponse.json({ message: "Pong" }, { status: 200 });
		}

		if (event === "pull_request") {
			const action = body.action;
			const repo = body.repository.full_name;
			const prNumber = body.number;

			const [owner, repoName] = repo.split("/");

			if (action === "opened" || action === "synchronize") {
				await reviewPullRequest(owner, repoName, prNumber)
					.then(() =>
						console.log(
							`Successfully processed pull request ${prNumber} for ${repo}`
						)
					)
					.catch((error: unknown) =>
						console.error(
							`Failed to process pull request ${prNumber} for ${repo}:`,
							error
						)
					);
			}
		}

		return NextResponse.json(
			{ message: "Event processed" },
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error processing webhook:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
