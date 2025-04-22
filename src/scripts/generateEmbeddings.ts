import { config } from "dotenv";
import mongoose from "mongoose";
import FaqModel from "../modules/faq/faq.models";
import OpenAI from "openai";

config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("✅ MongoDB bağlantısı başarılı.");

    const faqs = await FaqModel.find({ embedding: { $exists: false } });

    if (faqs.length === 0) {
      console.log("🔍 Tüm kayıtların embedding'leri zaten mevcut.");
      return;
    }

    for (const faq of faqs) {
      const inputText = `${faq.question}\n${faq.answer}`;
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: inputText,
      });

      faq.embedding = embeddingResponse.data[0].embedding;
      await faq.save();
      console.log(`✅ Embedding eklendi: ${faq._id}`);
    }

    console.log("✅ Tüm embedding'ler başarıyla üretildi.");
  } catch (error) {
    console.error("❌ Hata:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB bağlantısı kapatıldı.");
  }
}

main();
