import { config } from "dotenv";
import mongoose from "mongoose";
import { FAQ } from "../../modules/faq";

config();

function generateRandomVector(length = 1536): number[] {
  return Array.from({ length }, () => Math.random() * 2 - 1); // -1 ile 1 arasında sayı üret
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("✅ MongoDB bağlantısı başarılı.");

    const faqs = await FAQ.find({
      $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
    });

    if (faqs.length === 0) {
      console.log("🔍 Tüm kayıtların dummy embedding'leri zaten mevcut.");
      return;
    }

    for (const faq of faqs) {
      faq.embedding = generateRandomVector();
      await faq.save();
      console.log(`✅ Dummy embedding eklendi: ${faq._id}`);
    }

    console.log("🎉 Tüm dummy embedding’ler başarıyla eklendi.");
  } catch (error) {
    console.error("❌ Hata:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB bağlantısı kapatıldı.");
  }
}

main();
