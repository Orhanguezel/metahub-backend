// src/core/ai/pinecone.ts

import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME;

if (!apiKey) {
  throw new Error("❌ PINECONE_API_KEY is missing in your environment configuration.");
}

if (!indexName) {
  throw new Error("❌ PINECONE_INDEX_NAME is not defined in your environment.");
}

export const pinecone = new Pinecone({ apiKey });
export const PINECONE_INDEX_NAME = indexName;
