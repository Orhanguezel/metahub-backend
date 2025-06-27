import "@/core/config/envLoader";
import mongoose from "mongoose";
import path from "path";
import fs from "fs/promises";
import { Tenants } from "@/modules/tenants/tenants.model";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";

import { seedAllModuleMeta } from "./seedAllModuleMeta";
import { healthCheckMetaSettings } from "./healthCheckMetaSettings";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";

// --- Ortak Sabitler ---
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:adminpassword@localhost:27017/metahub-db?authSource=admin";
const MODULES_PATH = path.resolve(process.cwd(), "src/modules");

// --- 1. Fiziksel modül klasörlerini getir ---
async function getAllModuleNames(): Promise<string[]> {
  const modules = await fs.readdir(MODULES_PATH, { withFileTypes: true });
  return modules
    .filter((m) => m.isDirectory())
    .map((m) => m.name.toLowerCase());
}

// --- 2. Orphan meta ve settings cleanup ---
async function cleanupOrphanModules(validModuleNames: string[]) {
  const allMetas = await ModuleMeta.find();
  let orphanMetaCount = 0;
  let orphanSettingCount = 0;

  for (const meta of allMetas) {
    if (!validModuleNames.includes(meta.name.toLowerCase())) {
      await ModuleMeta.deleteOne({ name: meta.name });
      const deletedSettings = await ModuleSetting.deleteMany({
        module: meta.name,
      });
      orphanMetaCount++;
      orphanSettingCount += deletedSettings.deletedCount || 0;
      logger.info(
        t("sync.orphanMetaDeleted", "tr", translations, {
          moduleName: meta.name,
          count: deletedSettings.deletedCount,
        }),
        {
          module: "fullSyncModulesAndSettings",
          event: "orphan.meta.deleted",
          status: "success",
          meta: meta.name,
        }
      );
      console.log(
        `[CLEANUP] Orphan meta silindi: ${meta.name} (${deletedSettings.deletedCount} setting)`
      );
    }
  }
  if (orphanMetaCount > 0) {
    logger.info(
      t("sync.orphanCleanupSummary", "tr", translations, {
        orphanMetaCount,
        orphanSettingCount,
      }),
      {
        module: "fullSyncModulesAndSettings",
        event: "orphan.cleanup.summary",
        status: "info",
        orphanMetaCount,
        orphanSettingCount,
      }
    );
    console.log(
      `[RESULT] ${orphanMetaCount} orphan meta, ${orphanSettingCount} orphan setting kaldırıldı.`
    );
  }
}

// --- 3. Her tenant-modül için eksik setting’i tamamla ---
async function seedMissingSettingsForAllTenantsAndModules() {
  const allTenants = await Tenants.find({ isActive: true }).lean();
  const allModuleNames = await getAllModuleNames();
  let totalSeeded = 0;

  for (const tenant of allTenants) {
    for (const moduleName of allModuleNames) {
      try {
        await seedSettingsForNewModule(moduleName, tenant.slug);
        logger.info(
          t("sync.settingCreated", "tr", translations, {
            moduleName,
            tenant: tenant.slug,
          }),
          {
            module: "fullSyncModulesAndSettings",
            event: "setting.created",
            status: "success",
            tenant: tenant.slug,
            moduleName,
          }
        );
        totalSeeded++;
        console.log(`✅ [Seed] ${moduleName} → ${tenant.slug} tamamlandı.`);
      } catch (e) {
        logger.error(
          t("sync.settingSeedError", "tr", translations, {
            moduleName,
            tenant: tenant.slug,
            message: (e as any)?.message,
          }),
          {
            module: "fullSyncModulesAndSettings",
            event: "setting.error",
            status: "fail",
            tenant: tenant.slug,
            moduleName,
            error: (e as any)?.message,
          }
        );
        console.error(
          `❌ [Seed] ${moduleName} → ${tenant.slug} hata:`,
          (e as any)?.message || e
        );
      }
    }
  }
  logger.info(t("sync.seedSummary", "tr", translations, { totalSeeded }), {
    module: "fullSyncModulesAndSettings",
    event: "sync.summary",
    status: "info",
    totalSeeded,
  });
  console.log(
    `✅ [Sync] Tüm işlemler başarıyla tamamlandı. (Toplam ${totalSeeded} seed işlemi)`
  );
}

(async () => {
  try {
    logger.info("[Sync] MongoDB bağlantısı başlatılıyor...", {
      module: "fullSyncModulesAndSettings",
    });
    await mongoose.connect(MONGO_URI);
    logger.info("[Sync] MongoDB bağlantısı başarılı.", {
      module: "fullSyncModulesAndSettings",
    });

    // 1. Modül dizinlerini bul
    const allModuleNames = await getAllModuleNames();
    if (!allModuleNames.length) {
      logger.warn("Hiç modül bulunamadı.", {
        module: "fullSyncModulesAndSettings",
      });
      await mongoose.disconnect();
      process.exit(0);
    }
    logger.info(`[Sync] ${allModuleNames.length} modül klasörü bulundu.`, {
      module: "fullSyncModulesAndSettings",
    });

    // 2. Orphan meta/setting temizliği
    await cleanupOrphanModules(allModuleNames);

    // 3. Sadece fiziksel olarak var olan modüller için meta seed et
    await seedAllModuleMeta();

    // 4. Meta/setting tutarlılığı kontrol et ve eksikleri tamamla
    await healthCheckMetaSettings();

    // 5. Her tenant-modül için eksik setting seed et
    await seedMissingSettingsForAllTenantsAndModules();

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    logger.error("❌ [Sync] Hata oluştu:", {
      module: "fullSyncModulesAndSettings",
      error: (e as any)?.message || e,
    });
    await mongoose.disconnect();
    process.exit(1);
  }
})();
