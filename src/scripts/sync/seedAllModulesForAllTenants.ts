import "@/core/config/envLoader";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { seedSettingsForNewModule } from "./seedSettingsForNewModule";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

export const getAllModuleNames = async (): Promise<string[]> => {
  const modulesPath = path.resolve(process.cwd(), "src/modules");
  const modules = await fs.readdir(modulesPath, { withFileTypes: true });
  return modules.filter((m) => m.isDirectory()).map((m) => m.name);
};

async function ensureMasterConnection() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/metahub";
  const dbName = process.env.MONGO_DB || undefined;
  await mongoose.connect(uri, { dbName } as any);
}

export const seedAllModulesForAllTenants = async () => {
    await ensureMasterConnection();
  const locale = "en";
  const moduleNames = await getAllModuleNames();
  const allTenants = await Tenants.find({ isActive: true }).lean();

  let ok = 0, skip = 0, fail = 0;

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
      logger.error(`[Seed] Tenant slug eksik! ${JSON.stringify(tenant)}`, {
        script: "seedAllModulesForAllTenants",
        event: "invalid.tenant",
        status: "fail",
      });
      fail += moduleNames.length;
      continue;
    }

    // Bağlantı deneniyor (erken hata almak için)
    try {
      const conn = await getTenantDbConnection(tenantSlug);
      getTenantModelsFromConnection(conn);
      try { await conn.close(); } catch {}
    } catch (err) {
      logger.error(`[Seed][ERROR] Tenant DB yok/ulaşılamıyor: ${tenantSlug}`, {
        script: "seedAllModulesForAllTenants",
        event: "db.connection.error",
        status: "fail",
        tenant: tenantSlug,
        error: (err as any)?.message,
      });
      fail += moduleNames.length;
      continue;
    }

    for (const moduleName of moduleNames) {
      try {
        const res = await seedSettingsForNewModule(moduleName, tenantSlug);
        if (res.created) {
          ok += res.created;
          console.log(`✅ [Seed][${tenantSlug}] ${moduleName} → created:${res.created}, exists:${res.exists}, skipped:${res.skipped}`);
        } else if (res.exists) {
          skip += res.exists;
          console.log(`↺ [Seed][${tenantSlug}] ${moduleName} → already exists`);
        } else if (res.skipped) {
          skip += res.skipped;
          console.log(`⏭ [Seed][${tenantSlug}] ${moduleName} → skipped (no meta)`);
        }
      } catch (e) {
        fail++;
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
        console.error(`❌ [Seed] ${moduleName} → ${tenantSlug} hata:`, (e as any)?.message);
      }
    }
  }

  logger.info(
    t("sync.seedSummary", locale, translations, { successCount: ok, failCount: fail }),
    {
      script: "seedAllModulesForAllTenants",
      event: "seed.summary",
      status: "info",
      successCount: ok,
      failCount: fail,
      skipped: skip,
    }
  );
  console.log(`[RESULT] created:${ok}, skipped:${skip}, fail:${fail}`);
};
