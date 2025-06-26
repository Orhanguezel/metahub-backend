import "@/core/config/envLoader";
import mongoose from "mongoose";
import path from "path";
import fs from "fs/promises";
import { Tenants } from "@/modules/tenants/tenants.model";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import { seedAllModuleMeta } from "./seedAllModuleMeta";
import { healthCheckMetaSettings } from "./healthCheckMetaSettings";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:adminpassword@localhost:27017/metahub-db?authSource=admin";

const MODULES_PATH = path.join(__dirname, "../../modules");

// --- Fiziksel olarak var olan tüm modül klasörlerini döner (küçük harf!) ---
async function getAllModuleNames(): Promise<string[]> {
  const modules = await fs.readdir(MODULES_PATH, { withFileTypes: true });
  return modules
    .filter((m) => m.isDirectory())
    .map((m) => m.name.toLowerCase());
}

// --- Klasörü olmayan orphan meta ve ayarları DB’den sil! ---
async function cleanupOrphanModules(validModuleNames: string[]) {
  // Meta: Klasörü olmayanlar
  const allMetas = await ModuleMeta.find();
  let orphanMetaCount = 0;
  let orphanSettingCount = 0;

  for (const meta of allMetas) {
    if (!validModuleNames.includes(meta.name.toLowerCase())) {
      // Meta kaydını sil
      await ModuleMeta.deleteOne({ name: meta.name });
      // Ona ait tüm tenant settings’i sil
      const deletedSettings = await ModuleSetting.deleteMany({
        module: meta.name,
      });
      orphanMetaCount++;
      orphanSettingCount += deletedSettings.deletedCount || 0;
      console.log(
        `[CLEANUP] Orphan meta silindi: ${meta.name} (${deletedSettings.deletedCount} setting)`
      );
    }
  }
  if (orphanMetaCount > 0) {
    console.log(
      `[RESULT] ${orphanMetaCount} orphan meta, ${orphanSettingCount} orphan setting kaldırıldı.`
    );
  }
}

(async () => {
  try {
    // 1. DB bağlantısı
    console.log("[DEBUG] MONGO_URI:", MONGO_URI);
    console.log("🔄 [Sync] MongoDB bağlantısı kuruluyor...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ [Sync] MongoDB bağlantısı başarılı.");

    // 2. Tüm fiziksel modül klasörlerini bul
    const allModuleNames = await getAllModuleNames();
    if (!allModuleNames.length) {
      console.log("⚠️ Hiç modül bulunamadı.");
      await mongoose.disconnect();
      process.exit(0);
    }
    console.log(`🔄 ${allModuleNames.length} modül klasörü bulundu.`);

    // 3. Orphan meta ve settings’leri sil (klasörü olmayanlar)
    await cleanupOrphanModules(allModuleNames);

    // 4. Yalnızca fiziksel olarak var olan modüller için meta seed et
    await seedAllModuleMeta(); // Bu fonksiyon da fiziksel modül adına göre çalışmalı!

    // 5. Meta/setting tutarlılık kontrolü ve eksikleri tamamlama
    await healthCheckMetaSettings();

    // 6. Aktif tenantları bul
    const allTenants = await Tenants.find({ isActive: true }).lean();
    if (!allTenants.length) {
      console.log("⚠️ Hiç tenant bulunamadı. (isActive: true filter)");
      await mongoose.disconnect();
      process.exit(0);
    }
    console.log(`🔄 ${allTenants.length} tenant bulundu.`);

    // 7. Her tenant x modül için eksik ayarları oluştur
    let totalSeeded = 0;
    for (const tenant of allTenants) {
      for (const moduleName of allModuleNames) {
        try {
          await seedSettingsForNewModule(moduleName, tenant.slug);
          console.log(`✅ [Seed] ${moduleName} → ${tenant.slug} tamamlandı.`);
          totalSeeded++;
        } catch (e) {
          console.error(
            `❌ [Seed] ${moduleName} → ${tenant.slug} hata:`,
            (e as any)?.message || e
          );
        }
      }
    }

    // 8. Son rapor
    console.log(
      `✅ [Sync] Tüm işlemler başarıyla tamamlandı. (Toplam ${totalSeeded} seed işlemi)`
    );
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error("❌ [Sync] Hata oluştu:", e);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
