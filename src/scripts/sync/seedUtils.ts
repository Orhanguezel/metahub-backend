import "@/core/config/envLoader";
import fs from "fs/promises";
import path from "path";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";

// --- Tenant arayüzü (yalnızca gerekli alanlar) ---
interface Tenant {
  slug: string;
  isActive: boolean;
}

/**
 * src/modules altındaki tüm modül dizinlerinin adlarını döner.
 */
export async function getAllModuleNames(): Promise<string[]> {
  const modulesPath = path.resolve(process.cwd(), "src/modules");
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });
  return modules.filter((m) => m.isDirectory()).map((m) => m.name);
}

/**
 * Tüm aktif tenantlar için, fiziksel olarak var olan her modülün setting kaydını açar (sadece eksikse!).
 * Her tenantın kendi veritabanı/modeli kullanılır!
 */
export async function seedAllModulesForAllTenants(
  locale: SupportedLocale = "en"
) {
  const moduleNames = await getAllModuleNames();
  const allTenants = (await Tenants.find({ isActive: true }).lean()) as Tenant[];

  let successCount = 0, failCount = 0;

  if (!moduleNames.length || !allTenants.length) {
    logger.warn(t("sync.noModuleOrTenant", locale, translations), {
      script: "seedAllModulesForAllTenants",
      event: "no.data",
      status: "warning",
    });
    return;
  }

  for (const tenant of allTenants) {
    if (!tenant.slug) {
      logger.error(
        `[Seed] Tenant slug eksik! Tenant: ${JSON.stringify(tenant)}`,
        {
          script: "seedAllModulesForAllTenants",
          event: "invalid.tenant",
          status: "fail",
          tenant: tenant.slug,
        }
      );
      failCount += moduleNames.length;
      continue;
    }
    let conn, models;
    try {
      conn = await getTenantDbConnection(tenant.slug);
      models = getTenantModelsFromConnection(conn);
    } catch (err) {
      logger.error(
        `[Seed] Tenant DB bağlantı hatası: ${tenant.slug} ${(err as any)?.message}`,
        {
          script: "seedAllModulesForAllTenants",
          event: "db.connection.error",
          status: "fail",
          tenant: tenant.slug,
          error: (err as any)?.message,
        }
      );
      failCount += moduleNames.length;
      continue;
    }
    for (const moduleName of moduleNames) {
      try {
        // Her tenant+modül için seed işlemini o tenantın contextinde yap!
        // seedSettingsForNewModule idempotent çalışıyorsa burada doğrudan çağrılabilir,
        // ancak tenant contextini modele iletmek istiyorsan models.ModuleSetting ile çalış
        await seedSettingsForNewModule(moduleName, tenant.slug);

        logger.info(
          t("sync.settingCreated", locale, translations, {
            moduleName,
            tenant: tenant.slug,
          }),
          {
            script: "seedAllModulesForAllTenants",
            event: "setting.created",
            status: "success",
            tenant: tenant.slug,
            module: moduleName,
          }
        );
        successCount++;
        console.log(`✅ [Seed] ${moduleName} → ${tenant.slug} tamamlandı.`);
      } catch (e) {
        logger.error(
          t("sync.settingSeedError", locale, translations, {
            moduleName,
            tenant: tenant.slug,
            message: (e as any)?.message,
          }),
          {
            script: "seedAllModulesForAllTenants",
            event: "setting.error",
            status: "fail",
            tenant: tenant.slug,
            module: moduleName,
            error: (e as any)?.message,
          }
        );
        failCount++;
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
      script: "seedAllModulesForAllTenants",
      event: "seed.summary",
      status: "info",
      successCount,
      failCount,
    }
  );
  console.log(`[RESULT] Toplam başarılı: ${successCount}, hata: ${failCount}`);
}
