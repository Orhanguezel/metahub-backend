// src/scripts/faq/generateEmbeddingFromOpenAI.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateEmbeddingFromOpenAI(input: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input,
  });

  return response.data[0].embedding;
}
