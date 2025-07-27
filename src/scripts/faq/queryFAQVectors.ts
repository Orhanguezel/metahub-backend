import { pinecone, PINECONE_INDEX_NAME } from "./pinecone";
import type { SupportedLocale } from "@/types/common";
import type { FAQVectorMatch } from "@/scripts/faq/types";

export async function queryFAQVectors({
  vector,
  language,
  tenant,
  topK = 3,
  namespace = "default",
}: {
  vector: number[];
  language: SupportedLocale;
  tenant: string;
  topK?: number;
  namespace?: string;
}): Promise<FAQVectorMatch[]> {
  const index = pinecone.Index(PINECONE_INDEX_NAME);

  const result = await index.namespace(namespace).query({
    vector,
    topK,
    includeMetadata: true,
    filter: {
      category: { $eq: "faq" },
      language: { $eq: language },
    },
  });

  return result.matches as FAQVectorMatch[]; // Tip kesinleşmiş oluyor
}
