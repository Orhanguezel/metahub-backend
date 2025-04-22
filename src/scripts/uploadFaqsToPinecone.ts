import { config } from "dotenv";
import mongoose from "mongoose";
import { Pinecone } from "@pinecone-database/pinecone";
import FaqModel from "../modules/faq/faq.models";

config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("✅ MongoDB bağlantısı başarılı.");

    const faqs = await FaqModel.find({
      isActive: true,
      embedding: { $exists: true, $not: { $size: 0 } },
    });

    if (faqs.length === 0) {
      console.log("⛔ Yüklenecek uygun embedding bulunamadı.");
      return;
    }

    const vectors = faqs.map((faq) => ({
      id: faq._id.toString(),
      values: faq.embedding,
      metadata: {
        question: faq.question,
        answer: faq.answer,
        language: faq.language || "en",
      },
    }));

    console.log(`🚀 Pinecone’a yüklenecek veri adedi: ${vectors.length}`);

    await index.namespace("default").upsert(vectors);
    console.log("✅ Embedding verileri Pinecone’a başarıyla yüklendi.");
  } catch (error) {
    console.error("❌ Yükleme hatası:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB bağlantısı kapatıldı.");
  }
}

main();
