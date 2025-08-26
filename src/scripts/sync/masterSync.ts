// src/scripts/sync/masterSync.ts
import "@/core/config/envLoader";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";                // ✅ EKLE
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";

import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import { seedAllModuleMeta } from "./seedAllModuleMeta";
import { healthCheckMetaSettings } from "./healthCheckMetaSettings";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";

const MODULES_PATH = path.resolve(process.cwd(), "src/modules");

async function getAllModuleNames(): Promise<string[]> {
  const modules = await fs.readdir(MODULES_PATH, { withFileTypes: true });
  // İsterseniz lowercase kullanmaya devam edin; sorun değil.
  return modules.filter(m => m.isDirectory()).map(m => m.name);
}

async function cleanupOrphanModules(validModuleNames: string[]) {
  const tenants = await Tenants.find({ isActive: true }).lean();

  for (const tenant of tenants) {
    let conn: mongoose.Connection | null = null;
    try {
      conn = await getTenantDbConnection(tenant.slug);
      const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

      const allMetas = await ModuleMeta.find();
      let orphanMetaCount = 0;
      let orphanSettingCount = 0;

      for (const meta of allMetas) {
        if (!validModuleNames.includes(String(meta.name).toLowerCase())) {
          const deletedSettings = await ModuleSetting.deleteMany({ module: meta.name, tenant: tenant.slug });
await ModuleMeta.deleteOne({ name: meta.name, tenant: tenant.slug });
          orphanMetaCount++;
          orphanSettingCount += deletedSettings.deletedCount || 0;

          logger.info(
            t("sync.orphanMetaDeleted", "tr", translations, {
              moduleName: meta.name, count: deletedSettings.deletedCount, tenant: tenant.slug,
            }),
            { script: "fullSyncModulesAndSettings", event: "orphan.meta.deleted", status: "success", module: meta.name, tenant: tenant.slug }
          );
          console.log(`[CLEANUP] Orphan meta silindi: ${meta.name} [tenant: ${tenant.slug}] (${deletedSettings.deletedCount} setting)`);
        }
      }

      if (orphanMetaCount > 0) {
        logger.info(
          t("sync.orphanCleanupSummary", "tr", translations, { orphanMetaCount, orphanSettingCount }),
          { script: "fullSyncModulesAndSettings", event: "orphan.cleanup.summary", status: "info", orphanMetaCount, orphanSettingCount, tenant: tenant.slug }
        );
        console.log(`[RESULT] ${orphanMetaCount} orphan meta, ${orphanSettingCount} orphan setting kaldırıldı. [tenant: ${tenant.slug}]`);
      }
    } catch (e: any) {
      logger.error(`[CLEANUP][ERROR] ${tenant.slug}: ${e?.message || e}`, {
        script: "fullSyncModulesAndSettings", event: "cleanup.error", status: "fail", tenant: tenant.slug, error: e?.message || e,
      });
    } finally {
      // ✅ Tenant bağlantısını kapat
      try { await conn?.close(); } catch {}
    }
  }
}

async function seedMissingSettingsForAllTenantsAndModules() {
  const tenants = await Tenants.find({ isActive: true }).lean();
  const allModuleNames = await getAllModuleNames();

  for (const tenant of tenants) {
    try {
      for (const moduleName of allModuleNames) {
        await seedSettingsForNewModule(moduleName, tenant.slug);
        logger.info(
          t("sync.settingCreated", "tr", translations, { moduleName, tenant: tenant.slug }),
          { script: "fullSyncModulesAndSettings", event: "setting.created", status: "success", tenant: tenant.slug, module: moduleName }
        );
        console.log(`✅ [Seed] ${moduleName} → ${tenant.slug} tamamlandı.`);
      }
    } catch (e: any) {
      logger.error(
        t("sync.settingSeedError", "tr", translations, { message: e?.message }),
        { script: "fullSyncModulesAndSettings", event: "setting.error", status: "fail", tenant: tenant.slug, error: e?.message }
      );
      console.error(`❌ [Seed] ${tenant.slug} hata:`, e?.message || e);
    }
  }
}

export async function fullSyncModulesAndSettings() {
  // ✅ Master’a bağlanmadan Tenants.find() çağırmayın!
  await mongoose.connect(
    process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/metahub",
    { dbName: process.env.MONGO_DB, serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 } as any
  );

  logger.info("[Sync] Tam bulk sync başlatılıyor...", { script: "fullSyncModulesAndSettings" });

  const allModuleNames = await getAllModuleNames();
  if (!allModuleNames.length) {
    logger.warn("Hiç modül bulunamadı.", { script: "fullSyncModulesAndSettings" });
    return;
  }
  logger.info(`[Sync] ${allModuleNames.length} modül klasörü bulundu.`, { script: "fullSyncModulesAndSettings" });

  await cleanupOrphanModules(allModuleNames);
  await seedAllModuleMeta();        // Bu fonksiyon da Tenants kullandığı için master conn lazım
  await healthCheckMetaSettings();  // Aynı şekilde
  await seedMissingSettingsForAllTenantsAndModules();

  logger.info(`[Sync] Bulk işlemler başarıyla tamamlandı.`, { script: "fullSyncModulesAndSettings" });
}

// CLI
if (require.main === module) {
  (async () => {
    try {
      await fullSyncModulesAndSettings();
      await mongoose.disconnect();    // ✅ master conn kapat
      process.exit(0);
    } catch (e) {
      logger.error("❌ [Sync] Hata oluştu:", {
        script: "fullSyncModulesAndSettings",
        error: (e as any)?.stack || (e as any)?.message || e,
      });
      console.error("❌ [Sync] Hata oluştu:", e);
      try { await mongoose.disconnect(); } catch {}
      process.exit(1);
    }
  })();
}
