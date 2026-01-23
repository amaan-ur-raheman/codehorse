import { inngest } from "../client";
import {
	getPullRequestDiff,
	postReviewComment,
} from "@/modules/github/lib/github";
import { retrieveContext } from "@/modules/ai/lib/rag";
import prisma from "@/lib/db";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

/**
 * Inngest function to generate an AI code review for a Pull Request.
 *
 * Triggered by: "pr.review.requested" event.
 *
 * Workflow:
 * 1. **fetch-pr-data**: Retrieves the PR diff, title, and description from GitHub.
 * 2. **retrieve-context**: Uses RAG to fetch relevant code snippets from the vector DB based on PR content.
 * 3. **generate-ai-review**: Sends the diff and context to Google Gemini to generate the review markdown.
 * 4. **post-comment**: Posts the generated review as a comment on the GitHub PR.
 * 5. **save-review**: Saves the review details to the database.
 */
export const generateReview = inngest.createFunction(
	{ id: "generate-review", concurrency: 5 },
	{ event: "pr.review.requested" },
	async ({ event, step }) => {
		const { owner, repo, prNumber, userId } = event.data;

		const { diff, title, description, token } = await step.run(
			"fetch-pr-data",
			async () => {
				const account = await prisma.account.findFirst({
					where: {
						userId: userId,
						providerId: "github",
					},
				});

				if (!account?.accessToken) {
					throw new Error("No GitHub access token found");
				}

				const data = await getPullRequestDiff(
					account.accessToken,
					owner,
					repo,
					prNumber
				);

				return {
					...data,
					token: account.accessToken,
				};
			}
		);

		const context = await step.run("retrieve-context", async () => {
			const query = `${title}\n${description}`;

			return await retrieveContext(query, `${owner}/${repo}`);
		});

		const review = await step.run("generate-ai-review", async () => {
			const prompt = `You are an expert code reviewer. Analyze the following pull request and provide a detailed, constructive code review.

PR Title: ${title}
PR Description: ${description || "No description provided"}

Context from Codebase:
${context.join("\n\n")}

Code Changes:
\`\`\`diff
${diff}
\`\`\`

Please provide:
1. **Walkthrough**: A file-by-file explanation of the changes.
2. **Sequence Diagram**: A Mermaid JS sequence diagram visualizing the flow of the changes (if applicable). Use \`\`\`mermaid ... \`\`\` block. 
   **STRICT MERMAID RULES**:
   - Start with \`sequenceDiagram\`.
   - **MUST** explicitly declare all participants at the top using \`participant Alias as Name\`.
   - **DO NOT** use special characters like parentheses \`()\`, slashes \`/\`, dots \`.\`, brackets \`[]\`, or braces \`{}\` in participant names or message labels. Use only alphanumeric characters and spaces.
   - Example of a GOOD label: \`Process Payment Request\`
   - Example of a BAD label: \`processPayment(data)\`
   - Keep the diagram focused on the core logic changes.
   - If a diagram is not helpful for these changes, omit this section entirely.
3. **Summary**: Brief overview.
4. **Strengths**: What's done well.
5. **Issues**: Bugs, security concerns, code smells.
6. **Suggestions**: Specific code improvements.
7. **Poem**: A short, creative poem summarizing the changes at the very end.

Format your response in markdown.`;

			const { text } = await generateText({
				model: google("gemini-2.5-flash"),
				prompt,
			});

			return text;
		});

		await step.run("post-comment", async () => {
			await postReviewComment(token as string, owner, repo, prNumber, review as string);
		});

		await step.run("save-review", async () => {
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
						prTitle: title,
						prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
						review: review as string,
						status: "completed",
					},
				});
			}
		});
		return { success: true };
	}
);
