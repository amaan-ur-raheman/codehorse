import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_DB_API_KEY;
if (!apiKey) {
	throw new Error("PINECONE_DB_API_KEY environment variable is required");
}

export const pinecone = new Pinecone({
	apiKey,
});

export const pineconeIndex = pinecone.Index("codehorse-vector-embeddings-v2");
