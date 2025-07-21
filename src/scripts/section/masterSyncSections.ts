// src/scripts/section/masterSyncSections.ts

import "@/core/config/envLoader";
import mongoose from "mongoose";
import { seedAllSectionMeta } from "./seedAllSectionMeta";
import { syncSectionSettingsWithMeta } from "./syncSectionSettingsWithMeta";
import { removeSectionSettingFields } from "./removeSectionSettingFields";
// import { extraUtils } from "./utils/seedSectionUtils"; // Ekstra fonksiyonları ister aç

// ✅ Her yerde aynı env sectionKey'i kullan
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI || // fallback
  "mongodb://admin:adminpassword@localhost:27017/metahub-db?authSource=admin";

console.log("[Section] Senkronizasyon başlatılıyor. DB URI:", MONGODB_URI);

async function masterSyncSections() {
  try {
    // DB bağlantısı (baştan bir kez!)
    await mongoose.connect(MONGODB_URI);

    // 1️⃣ SectionMeta seed (ekle/güncelle)
    await seedAllSectionMeta();

    // 2️⃣ SectionSetting sync (tenant'lara uygun hale getir)
    await syncSectionSettingsWithMeta();

    // 3️⃣ SectionSetting eski alanları temizle
    await removeSectionSettingFields();

    // 4️⃣ (Opsiyonel) Ekstra utils/script zinciri
    // await extraUtils();

    console.log("🎉 [Section] Tam senkronizasyon tamamlandı!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[Section] Sync Pipeline Error:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Direkt çağrı (import edilirse çalışmaz, sadece direkt run’da çalışır)
if (require.main === module) {
  masterSyncSections();
}
