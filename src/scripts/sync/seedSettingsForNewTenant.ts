import "@/core/config/envLoader";
import fs from "fs/promises";
import path from "path";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

/** --- Tüm modül klasörlerinin adını (case-sensitive!) alır --- */
export const getAllModuleNames = async (): Promise<string[]> => {
  const modulesPath = path.resolve(process.cwd(), "src/modules");
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });
  return modules
    .filter((m) => m.isDirectory())
    .map((m) => m.name); // DİKKAT: lowercase yapma! DB ve dosya sistemi farklı olabilir.
};

/** --- Her modül, her tenant için eksik setting kaydı açar --- */
export const seedAllModulesForAllTenants = async () => {
  const locale = "en";
  const moduleNames = await getAllModuleNames();
  const allTenants = await Tenants.find({ isActive: true }).lean();

  let successCount = 0;
  let failCount = 0;

  if (!moduleNames.length || !allTenants.length) {
    logger.warn(t("sync.noModuleOrTenant", locale, translations), {
      script: "seedAllModulesForAllTenants",
      event: "no.data",
      status: "warning",
    });
    return;
  }

  for (const tenant of allTenants) {
    const tenantSlug: string = typeof tenant.slug === "string" ? tenant.slug : "";
    if (!tenantSlug) {
      logger.error(
        `[Seed] Tenant slug eksik! Tenant: ${JSON.stringify(tenant)}`,
        {
          script: "seedAllModulesForAllTenants",
          event: "invalid.tenant",
          status: "fail",
          tenant: tenantSlug,
        }
      );
      failCount += moduleNames.length;
      continue;
    }

    // Tenant'ın kendi bağlantısı ve modelleri
    let tenantConn, tenantModels;
    try {
      tenantConn = await getTenantDbConnection(tenantSlug);
      tenantModels = getTenantModelsFromConnection(tenantConn);
    } catch (err) {
      logger.error(`[Seed][ERROR] Tenant DB bağlantısı kurulamadı: ${tenantSlug}`, {
        script: "seedAllModulesForAllTenants",
        event: "db.connection.error",
        status: "fail",
        tenant: tenantSlug,
        error: (err as any)?.message,
      });
      failCount += moduleNames.length;
      continue;
    }

    for (const moduleName of moduleNames) {
      try {
        // Her modül+tenant için seed fonksiyonu (tenantSlug parametresi zorunlu!)
        await seedSettingsForNewModule(moduleName, tenantSlug);
        successCount++;
        logger.info(
          t("sync.settingCreated", locale, translations, {
            moduleName,
            tenant: tenantSlug,
          }),
          {
            script: "seedAllModulesForAllTenants",
            event: "setting.created",
            status: "success",
            tenant: tenantSlug,
            module: moduleName,
          }
        );
        console.log(`✅ [Seed] ${moduleName} → ${tenantSlug} tamamlandı.`);
      } catch (e) {
        failCount++;
        logger.error(
          t("sync.settingSeedError", locale, translations, {
            moduleName,
            tenant: tenantSlug,
            message: (e as any)?.message,
          }),
          {
            script: "seedAllModulesForAllTenants",
            event: "setting.error",
            status: "fail",
            tenant: tenantSlug,
            module: moduleName,
            error: (e as any)?.message,
          }
        );
        console.error(
          `❌ [Seed] ${moduleName} → ${tenantSlug} hata:`,
          (e as any)?.message
        );
      }
    }
  }

  logger.info(
    t("sync.seedSummary", locale, translations, { successCount, failCount }),
    {
      script: "seedAllModulesForAllTenants",
      event: "seed.summary",
      status: "info",
      successCount,
      failCount,
    }
  );
  console.log(`[RESULT] Toplam başarılı: ${successCount}, hata: ${failCount}`);
};
