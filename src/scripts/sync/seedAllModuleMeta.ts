import "@/core/config/envLoader";
import fs from "fs";
import path from "path";
import { Tenants } from "@/modules/tenants/tenants.model";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

const DEFAULT_META = {
  icon: "box",
  enabled: true,
  roles: ["admin"],
  language: "en",
  version: "1.0.0",
  order: 0,
  routes: [],
  history: [],
  statsKey: "",
};

export async function seedAllModuleMeta() {
  try {
    const modulesDir = path.resolve(process.cwd(), "src/modules");
    if (!fs.existsSync(modulesDir)) {
      throw new Error(`src/modules dizini bulunamadı: ${modulesDir}`);
    }
    // 1️⃣ Aktif tenantları çek
    const tenants = await Tenants.find({ isActive: true }).lean();
    if (!tenants.length) {
      logger.warn("[META] Hiç aktif tenant yok!", {
        script: "seedAllModuleMeta",
        event: "meta.no_tenants",
        status: "warning",
      });
      return;
    }
    // 2️⃣ Modül klasörlerini oku
    const allEntries = fs.readdirSync(modulesDir);
    const modules: string[] = [];
    for (const entry of allEntries) {
      const fullPath = path.join(modulesDir, entry);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          modules.push(entry);
        }
      } catch (err) {
        logger.warn(`[META] Klasör okunamadı: ${entry} (${err.message})`, {
          script: "seedAllModuleMeta",
          event: "fs.error",
          status: "warning",
        });
      }
    }
    if (modules.length === 0) {
      logger.warn(`[META] Hiç modül klasörü bulunamadı. Path: ${modulesDir}`, {
        script: "seedAllModuleMeta",
        event: "meta.no_modules",
        status: "warning",
      });
      console.log(`[META] Hiç modül klasörü bulunamadı!`);
      return;
    }

    let count = 0;
    // 3️⃣ Her tenant-modül kombinasyonu için meta oluştur
    for (const tenant of tenants) {
      // Tenant'ın kendi DB connection'unu al
      const conn = await getTenantDbConnection(tenant.slug);
      const { ModuleMeta } = getTenantModelsFromConnection(conn);

      for (const moduleName of modules) {
        try {
          // Aynı tenant+modül için zaten varsa atla
          const exists = await ModuleMeta.findOne({ name: moduleName, tenant: tenant.slug });
          if (!exists) {
            const label = fillAllLocales(moduleName);
            await ModuleMeta.create({
              tenant: tenant.slug,
              name: moduleName,
              label,
              ...DEFAULT_META,
            });
            count++;
            logger.info(
              t("sync.metaCreated", "tr", translations, { moduleName }),
              {
                script: "seedAllModuleMeta",
                event: "meta.created",
                status: "success",
                tenant: tenant.slug,
                module: moduleName,
              }
            );
            console.log(`[META] ${moduleName} meta kaydı eklendi → ${tenant.slug}`);
          } else {
            logger.info(
              t("sync.metaExists", "tr", translations, { moduleName }),
              {
                script: "seedAllModuleMeta",
                event: "meta.exists",
                status: "info",
                tenant: tenant.slug,
                module: moduleName,
              }
            );
          }
        } catch (err) {
          logger.error(
            `[META] Meta eklenemedi: ${moduleName} → ${tenant.slug} (${err.message})`,
            {
              script: "seedAllModuleMeta",
              event: "meta.create_error",
              status: "fail",
              moduleName,
              tenant: tenant.slug,
            }
          );
          console.error(`[META] Meta eklenemedi: ${moduleName} → ${tenant.slug}:`, err);
        }
      }
    }
    logger.info(
      t("sync.metaSummary", "tr", translations, { count }),
      {
        script: "seedAllModuleMeta",
        event: "meta.summary",
        status: "info",
        count,
      }
    );
    console.log(`[META] Toplam ${count} yeni meta kaydı eklendi.`);
  } catch (e: any) {
    logger.error(`[META] seedAllModuleMeta hata: ${e.message}`, {
      script: "seedAllModuleMeta",
      event: "meta.error",
      status: "fail",
    });
    console.error(`[META] seedAllModuleMeta hata:`, e);
    throw e;
  }
}
