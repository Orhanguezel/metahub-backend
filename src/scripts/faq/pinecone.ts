// src/scripts/faq/pinecone.ts

import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME;

if (!apiKey) {
  throw new Error(
    "❌ PINECONE_API_KEY is missing in your environment configuration (.env)"
  );
}

if (!indexName) {
  throw new Error(
    "❌ PINECONE_INDEX_NAME is missing in your environment configuration (.env)"
  );
}

// ✅ Pinecone istemcisi singleton olarak dışa aktarılır
export const pinecone = new Pinecone({ apiKey });

// ✅ Index adı merkezi olarak dışa aktarılır (tenant bazlı namespace’ler buna göre açılır)
export const PINECONE_INDEX_NAME: string = indexName;

// ✅ Varsayılan namespace adı (değiştirilebilir)
export const DEFAULT_NAMESPACE = "default";
