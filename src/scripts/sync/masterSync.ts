import "@/core/config/envLoader";
import fs from "fs/promises";
import path from "path";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";

import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import { seedAllModuleMeta } from "./seedAllModuleMeta";
import { healthCheckMetaSettings } from "./healthCheckMetaSettings";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";

// --- Ortak Sabitler ---
const MODULES_PATH = path.resolve(process.cwd(), "src/modules");

/**
 * Tüm fiziksel modül klasörlerini döner (lowercase).
 */
async function getAllModuleNames(): Promise<string[]> {
  const modules = await fs.readdir(MODULES_PATH, { withFileTypes: true });
  return modules
    .filter((m) => m.isDirectory())
    .map((m) => m.name.toLowerCase());
}

/**
 * Her tenant’ın DB’sinde: Orphan meta ve ayar cleanup — sadece fiziksel modül olmayanları temizle!
 */
async function cleanupOrphanModules(validModuleNames: string[]) {
  const tenants = await Tenants.find({ isActive: true }).lean();

  for (const tenant of tenants) {
    try {
      const conn = await getTenantDbConnection(tenant.slug);
      const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

      const allMetas = await ModuleMeta.find();
      let orphanMetaCount = 0;
      let orphanSettingCount = 0;

      for (const meta of allMetas) {
        if (!validModuleNames.includes(meta.name.toLowerCase())) {
          const deletedSettings = await ModuleSetting.deleteMany({
            module: meta.name,
          });
          await ModuleMeta.deleteOne({ name: meta.name });
          orphanMetaCount++;
          orphanSettingCount += deletedSettings.deletedCount || 0;
          logger.info(
            t("sync.orphanMetaDeleted", "tr", translations, {
              moduleName: meta.name,
              count: deletedSettings.deletedCount,
              tenant: tenant.slug,
            }),
            {
              script: "fullSyncModulesAndSettings",
              event: "orphan.meta.deleted",
              status: "success",
              module: meta.name,
              tenant: tenant.slug,
            }
          );
          console.log(
            `[CLEANUP] Orphan meta silindi: ${meta.name} [tenant: ${tenant.slug}] (${deletedSettings.deletedCount} setting)`
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
            script: "fullSyncModulesAndSettings",
            event: "orphan.cleanup.summary",
            status: "info",
            orphanMetaCount,
            orphanSettingCount,
            tenant: tenant.slug,
          }
        );
        console.log(
          `[RESULT] ${orphanMetaCount} orphan meta, ${orphanSettingCount} orphan setting kaldırıldı. [tenant: ${tenant.slug}]`
        );
      }
    } catch (e) {
      logger.error(`[CLEANUP][ERROR] ${tenant.slug}: ${e?.message || e}`, {
        script: "fullSyncModulesAndSettings",
        event: "cleanup.error",
        status: "fail",
        tenant: tenant.slug,
        error: e?.message || e,
      });
    }
  }
}

/**
 * Her tenant+modül için eksik setting’i tamamlar (yalnızca eksik mapping'ler için çalışır!)
 */
async function seedMissingSettingsForAllTenantsAndModules() {
  const tenants = await Tenants.find({ isActive: true }).lean();
  const allModuleNames = await getAllModuleNames();

  for (const tenant of tenants) {
    try {
      for (const moduleName of allModuleNames) {
        await seedSettingsForNewModule(moduleName, tenant.slug); // Bu fonksiyon da multi-tenant aware olmalı!
        // (İçinde kendi connection ile çalışıyor olmalı!)
        logger.info(
          t("sync.settingCreated", "tr", translations, {
            moduleName,
            tenant: tenant.slug,
          }),
          {
            script: "fullSyncModulesAndSettings",
            event: "setting.created",
            status: "success",
            tenant: tenant.slug,
            module: moduleName,
          }
        );
        console.log(`✅ [Seed] ${moduleName} → ${tenant.slug} tamamlandı.`);
      }
    } catch (e) {
      logger.error(
        t("sync.settingSeedError", "tr", translations, {
          message: (e as any)?.message,
        }),
        {
          script: "fullSyncModulesAndSettings",
          event: "setting.error",
          status: "fail",
          tenant: tenant.slug,
          error: (e as any)?.message,
        }
      );
      console.error(
        `❌ [Seed] ${tenant.slug} hata:`,
        (e as any)?.message || e
      );
    }
  }
}

/**
 * Ana senkronizasyon fonksiyonu
 */
export async function fullSyncModulesAndSettings() {
  logger.info("[Sync] Tam bulk sync başlatılıyor...", {
    script: "fullSyncModulesAndSettings",
  });
  const allModuleNames = await getAllModuleNames();
  if (!allModuleNames.length) {
    logger.warn("Hiç modül bulunamadı.", {
      script: "fullSyncModulesAndSettings",
    });
    return;
  }
  logger.info(`[Sync] ${allModuleNames.length} modül klasörü bulundu.`, {
    script: "fullSyncModulesAndSettings",
  });

  // --- Her tenant için: (1) orphan temizliği, (2) meta seed, (3) health check, (4) eksik settings seed ---
  await cleanupOrphanModules(allModuleNames);
  await seedAllModuleMeta();         // Bu fonksiyon da tenant-aware olmalı!
  await healthCheckMetaSettings();   // Bu da tenant-aware olmalı!
  await seedMissingSettingsForAllTenantsAndModules();

  logger.info(`[Sync] Bulk işlemler başarıyla tamamlandı.`, {
    script: "fullSyncModulesAndSettings",
  });
}

// --- CLI veya CI/CD ile manuel çalıştırma desteği ---
if (require.main === module) {
  (async () => {
    try {
      await fullSyncModulesAndSettings();
      process.exit(0);
    } catch (e) {
      logger.error("❌ [Sync] Hata oluştu:", {
        script: "fullSyncModulesAndSettings",
        error: (e as any)?.stack || (e as any)?.message || e,
      });
      console.error("❌ [Sync] Hata oluştu:", e);
      process.exit(1);
    }
  })();
}
