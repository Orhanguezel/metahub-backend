import "@/core/config/envLoader";
import mongoose from "mongoose";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

const emptyLocaleObj = SUPPORTED_LOCALES.reduce((obj, lng) => {
  obj[lng] = "";
  return obj;
}, {} as Record<string, string>);

const DEFAULT_SETTING = {
  enabled: true,
  visibleInSidebar: true,
  useAnalytics: false,
  showInDashboard: true,
  roles: ["admin"],
  order: 0,
  seoTitle: { ...emptyLocaleObj },
  seoDescription: { ...emptyLocaleObj },
  seoSummary: { ...emptyLocaleObj },
  seoOgImage: "",
};

async function ensureMasterConnection() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/metahub";
  const dbName = process.env.MONGO_DB || undefined;
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  } as any);
}

/**
 * Her tenant DB’sinde ModuleMeta ↔ ModuleSetting tutarlılığı;
 * eksik olan setting varsa tenant contextinde oluşturur.
 */
export async function healthCheckMetaSettings() {
  const locale: SupportedLocale = "en";
  await ensureMasterConnection();

  const tenants = await Tenants.find({ isActive: true }).lean();
  if (!tenants.length) {
    logger.warn("[healthCheck] Hiç aktif tenant yok!", {
      script: "healthCheckMetaSettings",
      event: "tenants.none",
      status: "warning",
    });
    return;
  }

  let repairedCount = 0;
  let errorCount = 0;

  for (const tenant of tenants) {
    try {
      const conn = await getTenantDbConnection(tenant.slug);
      const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

      // ⚠️ Tenant scoped
      const modules = await ModuleMeta.find({ tenant: tenant.slug }).lean();

      for (const mod of modules) {
        try {
          const exists = await ModuleSetting.findOne({ module: mod.name, tenant: tenant.slug }).lean();
          if (!exists) {
            await ModuleSetting.create({
              module: mod.name,
              tenant: tenant.slug,        // 👈 zorunlu
              enabled: mod.enabled ?? DEFAULT_SETTING.enabled,
              visibleInSidebar: DEFAULT_SETTING.visibleInSidebar,
              useAnalytics: DEFAULT_SETTING.useAnalytics,
              showInDashboard: DEFAULT_SETTING.showInDashboard,
              roles: Array.isArray(mod.roles) && mod.roles.length ? mod.roles : DEFAULT_SETTING.roles,
              order: typeof mod.order === "number" ? mod.order : DEFAULT_SETTING.order,
              seoTitle: { ...DEFAULT_SETTING.seoTitle },
              seoDescription: { ...DEFAULT_SETTING.seoDescription },
              seoSummary: { ...DEFAULT_SETTING.seoSummary },
              seoOgImage: DEFAULT_SETTING.seoOgImage,
            });
            repairedCount++;
            logger.info(
              t("sync.settingRepaired", locale, translations, { moduleName: mod.name, tenant: tenant.slug }),
              { script: "healthCheckMetaSettings", event: "setting.repaired", status: "success", tenant: tenant.slug, module: mod.name }
            );
          }
        } catch (err: any) {
          errorCount++;
          logger.error(`[healthCheck] Setting eklenemedi: ${tenant.slug} - ${mod.name} (${err.message})`, {
            script: "healthCheckMetaSettings",
            event: "setting.create_error",
            status: "fail",
            tenant: tenant.slug,
            module: mod.name,
          });
        }
      }

      try { await conn.close(); } catch {}
    } catch (err: any) {
      errorCount++;
      logger.error(`[healthCheck] Tenant bağlantı hatası: ${tenant.slug} (${err.message})`, {
        script: "healthCheckMetaSettings",
        event: "tenant.conn_error",
        status: "fail",
        tenant: tenant.slug,
      });
    }
  }

  if (!repairedCount && !errorCount) {
    logger.info(t("sync.settingsOk", locale, translations), {
      script: "healthCheckMetaSettings",
      event: "settings.ok",
      status: "info",
    });
  } else {
    logger.info(
      t("sync.missingSettings", locale, translations, { count: repairedCount }),
      {
        script: "healthCheckMetaSettings",
        event: "settings.repaired",
        status: errorCount ? "warning" : "success",
        repairedCount,
        errorCount,
      }
    );
  }
}

// CLI
if (require.main === module) {
  (async () => {
    try {
      await healthCheckMetaSettings();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err: any) {
      console.error("❌ [healthCheck] Hata:", err?.message || err);
      try { await mongoose.disconnect(); } catch {}
      process.exit(1);
    }
  })();
}
