import { pineconeIndex } from "@/lib/pinecone";

import { embed } from "ai";
import { google } from "@ai-sdk/google";
import pLimit from "p-limit";

// This is a character limit, aligned with Google's text-embedding-004 model maximum input length, typically around 8192 characters for token-based models.
const MAX_EMBEDDING_CONTENT_LENGTH = 8000;

/**
 * Generates vector embeddings for a given text string using Google's text-embedding-004 model.
 *
 * @param text - The input text to embed.
 * @returns A promise that resolves to the embedding vector (array of numbers).
 */
/**
 * Generates text embeddings using Google's text-embedding-004 model
 * @param text - Text content to embed
 * @returns Promise resolving to embedding vector
 */
export async function generateEmbedding(text: string) {
	const { embedding } = await embed({
		model: google.textEmbeddingModel("text-embedding-004"),
		value: text,
	});

	return embedding;
}

/**
 * Indexes a codebase by generating embeddings for each file and storing them in Pinecone.
 *
 * This function:
 * 1. Iterates through the provided files.
 * 2. Truncates content to fit context limits (8000 chars).
 * 3. Generates embeddings for the file content.
 * 4. Upserts the vectors to Pinecone in batches.
 *
 * @param repoId - The unique identifier for the repository (e.g., "owner/repo").
 * @param files - Array of file objects containing path and content.
 * @param concurrencyLimit - Maximum number of concurrent embedding requests (default: 10).
 */
/**
 * Indexes codebase files into Pinecone vector database for RAG
 * @param repoId - Repository identifier
 * @param files - Array of file objects with path and content
 * @param concurrencyLimit - Max concurrent embedding requests (defaults to env var EMBEDDING_CONCURRENCY_LIMIT or 10)
 * @returns Object containing processing stats: successCount, failedCount, and failedFiles
 */
type Vector = {
	id: string;
	values: number[];
	metadata: {
		repoId: string;
		filePath: string;
		content: string;
	};
};

export async function indexCodebase(
	repoId: string,
	files: { path: string; content: string }[],
	concurrencyLimit: number = process.env.EMBEDDING_CONCURRENCY_LIMIT
		? parseInt(process.env.EMBEDDING_CONCURRENCY_LIMIT, 10)
		: 10
) {
	const limit = pLimit(concurrencyLimit);

	const results = await Promise.all(
		files.map((file) =>
			limit(async () => {
				const content = `File: ${file.path}\n\n${file.content}`;
				const truncatedContent = content.slice(0, MAX_EMBEDDING_CONTENT_LENGTH);

				try {
					const embedding = await generateEmbedding(truncatedContent);
					return {
						status: "success" as const,
						data: {
							id: `${repoId}-${file.path.replace(/\//g, "_")}`,
							values: embedding,
							metadata: {
								repoId,
								filePath: file.path,
								content: truncatedContent,
							},
						} as Vector,
					};
				} catch (error) {
					console.error(`Failed to embed ${file.path}:`, error);
					return {
						status: "error" as const,
						filePath: file.path,
						error: error instanceof Error ? error.message : String(error),
					};
				}
			})
		)
	);

	const vectors = results
		.filter((r) => r.status === "success")
		.map((r) => (r as { status: "success"; data: Vector }).data);

	const failedFiles = results
		.filter((r) => r.status === "error")
		.map((r) => r as { status: "error"; filePath: string; error: string });

	if (vectors.length > 0) {
		const batchSize = 100;

		for (let i = 0; i < vectors.length; i += batchSize) {
			const batch = vectors.slice(i, i + batchSize);
			try {
				await pineconeIndex.upsert(batch);
			} catch (error) {
				console.error(`Failed to upsert batch ${i / batchSize}:`, error);
			}
		}
	}

	console.log(`Indexing completed. Success: ${vectors.length}, Failed: ${failedFiles.length}`);

	return {
		successCount: vectors.length,
		failedCount: failedFiles.length,
		failedFiles,
	};
}

/**
 * Retrieves relevant context from the vector database for a given query.
 *
 * @param query - The search query (e.g., PR title + description).
 * @param repoId - The repository ID to filter results by.
 * @param topK - The number of results to retrieve (default: 5).
 * @returns An array of matching code snippets (strings).
 */
/**
 * Retrieves relevant code context from vector database using semantic search
 * @param query - Search query text
 * @param repoId - Repository identifier to filter results
 * @param topK - Number of top results to return (default: 5)
 * @returns Promise resolving to array of relevant code snippets
 */
export async function retrieveContext(
	query: string,
	repoId: string,
	topK: number = 5
) {
	const embedding = await generateEmbedding(query);

	const results = await pineconeIndex.query({
		vector: embedding,
		filter: { repoId },
		topK,
		includeMetadata: true,
	});

	return results.matches
		.map((match) => match.metadata?.content as string)
		.filter(Boolean);
}
