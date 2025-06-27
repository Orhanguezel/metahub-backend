import "@/core/config/envLoader";
import fs from "fs/promises";
import path from "path";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";

export const getAllModuleNames = async (): Promise<string[]> => {
  const modulesPath = path.resolve(process.cwd(), "src/modules");
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });
  return modules
    .filter((m) => m.isDirectory())
    .map((m) => m.name.toLowerCase());
};

export const seedAllModulesForAllTenants = async () => {
  const locale = "en"; // tek noktadan değiştir
  const moduleNames = await getAllModuleNames();
  const allTenants = await Tenants.find({ isActive: true }).lean();

  let successCount = 0,
    failCount = 0;
  if (!moduleNames.length || !allTenants.length) {
    logger.warn(t("sync.noModuleOrTenant", locale, translations), {
      module: "seedAllModulesForAllTenants",
      event: "no.data",
      status: "warning",
    });
    return;
  }

  for (const moduleName of moduleNames) {
    for (const tenant of allTenants) {
      try {
        await seedSettingsForNewModule(moduleName, tenant.slug);
        successCount++;
        logger.info(
          t("sync.settingCreated", locale, translations, {
            moduleName,
            tenant: tenant.slug,
          }),
          {
            module: "seedAllModulesForAllTenants",
            event: "setting.created",
            status: "success",
            tenant: tenant.slug,
            moduleName,
          }
        );
        console.log(`✅ [Seed] ${moduleName} → ${tenant.slug} tamamlandı.`);
      } catch (e) {
        failCount++;
        logger.error(
          t("sync.settingSeedError", locale, translations, {
            moduleName,
            tenant: tenant.slug,
            message: (e as any)?.message,
          }),
          {
            module: "seedAllModulesForAllTenants",
            event: "setting.error",
            status: "fail",
            tenant: tenant.slug,
            moduleName,
            error: (e as any)?.message,
          }
        );
        console.error(
          `❌ [Seed] ${moduleName} → ${tenant.slug} hata:`,
          (e as any)?.message
        );
      }
    }
  }
  logger.info(
    t("sync.seedSummary", locale, translations, { successCount, failCount }),
    {
      module: "seedAllModulesForAllTenants",
      event: "seed.summary",
      status: "info",
      successCount,
      failCount,
    }
  );
  console.log(`[RESULT] Toplam başarılı: ${successCount}, hata: ${failCount}`);
};
