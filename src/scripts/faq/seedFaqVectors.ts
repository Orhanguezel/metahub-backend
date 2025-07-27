import fs from "fs/promises";
import path from "path";
import { Pinecone } from "@pinecone-database/pinecone";
import type { SupportedLocale } from "@/types/common";

interface VectorMetadata {
  category: "faq";
  language: SupportedLocale;
  question: Record<string, string>;
  answer: Record<string, string>;
}

interface VectorData {
  id: string;
  values: number[];
  metadata: {
    [key: string]: any; // ✅ Geniş tanım (Pinecone uyumlu)
  };
}


// ✅ Ortam değişkenlerini kontrol et
const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME!;
const NAMESPACE = "default";

if (!PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
  throw new Error("Missing environment variables for Pinecone.");
}

const loadDummyData = async (): Promise<VectorData[]> => {
  const filePath = path.resolve(__dirname, "./faq-vectors.json");
  const fileContent = await fs.readFile(filePath, "utf-8");
  const raw: any[] = JSON.parse(fileContent);

  return raw.map((item, index) => ({
    id: item.id || `faq-${index}`,
    values: item.values || Array.from({ length: 1536 }, () => Math.random() * 2 - 1),
    metadata: {
      category: "faq",
      language: item.language as SupportedLocale,
      question: item.question,
      answer: item.answer,
    },
  }));
};

const run = async () => {
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.Index(PINECONE_INDEX_NAME);

  const vectors = await loadDummyData();

  console.log(`🚀 Uploading ${vectors.length} vectors to Pinecone...`);

  await index.namespace(NAMESPACE).upsert(vectors);

  console.log(`✅ Upload complete.`);

  const queryVector = vectors[0].values;

  const result = await index.namespace(NAMESPACE).query({
    vector: queryVector,
    topK: 3,
    includeMetadata: true,
    filter: {
      category: { $eq: "faq" },
      language: { $eq: vectors[0].metadata.language },
    },
  });

  console.log("🔍 Query Result:");
  console.dir(result, { depth: null });
};

run().catch((err) => {
  console.error("❌ Pinecone vector operation failed:", err);
});
