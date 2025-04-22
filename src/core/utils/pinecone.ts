import { Pinecone } from "@pinecone-database/pinecone";

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error("❌ PINECONE_INDEX_NAME is not set in environment variables.");
}
