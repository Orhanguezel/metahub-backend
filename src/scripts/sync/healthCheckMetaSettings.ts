import "@/core/config/envLoader";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

// Modeldeki tüm setting alanları için default değer (SEO override field’ları dahil)
const DEFAULT_SETTING = {
  enabled: true,
  visibleInSidebar: true,
  useAnalytics: false,
  showInDashboard: true,
  roles: ["admin"],
  order: 0,
  seoTitle: {},
  seoDescription: {},
  seoSummary: {},
  seoOgImage: "",
};

/**
 * Her tenant'ın kendi DB’sinde, tenant’a ait tüm meta+setting ilişkisini sağlık kontrolünden geçirir;
 * eksik setting’i varsa tenant’ın DB’sine ekler!
 */
export async function healthCheckMetaSettings() {
  const locale: SupportedLocale = "en";
  let repaired: { tenant: string; module: string }[] = [];
  let errorCount = 0;

  // 1️⃣ Aktif tenant listesini al
  const tenants = await Tenants.find({ isActive: true }).lean();
  if (!tenants.length) {
    logger.warn("[healthCheck] Hiç aktif tenant yok!", {
      script: "healthCheckMetaSettings",
      event: "tenants.none",
      status: "warning",
    });
    return;
  }

  // 2️⃣ Her tenant için kendi connection ve modellerini çek, meta/setting’i kontrol et
  for (const tenant of tenants) {
    try {
      const conn = await getTenantDbConnection(tenant.slug);
      const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

      // Bu tenant’ın meta’larını çek
      const modules = await ModuleMeta.find({});
      for (const mod of modules) {
        try {
          const exists = await ModuleSetting.findOne({ module: mod.name });
          if (!exists) {
            await ModuleSetting.create({
              module: mod.name,
              enabled: mod.enabled ?? DEFAULT_SETTING.enabled,
              visibleInSidebar: DEFAULT_SETTING.visibleInSidebar,
              useAnalytics: DEFAULT_SETTING.useAnalytics,
              showInDashboard: DEFAULT_SETTING.showInDashboard,
              roles:
                Array.isArray(mod.roles) && mod.roles.length > 0
                  ? mod.roles
                  : DEFAULT_SETTING.roles,
              order: typeof mod.order === "number" ? mod.order : DEFAULT_SETTING.order,
              seoTitle: DEFAULT_SETTING.seoTitle,
              seoDescription: DEFAULT_SETTING.seoDescription,
              seoSummary: DEFAULT_SETTING.seoSummary,
              seoOgImage: DEFAULT_SETTING.seoOgImage,
            });
            repaired.push({ tenant: tenant.slug, module: mod.name });
            logger.info(
              t("sync.settingRepaired", locale, translations, {
                moduleName: mod.name,
                tenant: tenant.slug,
              }),
              {
                script: "healthCheckMetaSettings",
                event: "setting.repaired",
                status: "success",
                tenant: tenant.slug,
                module: mod.name,
              }
            );
            console.log(`[REPAIRED] ${tenant.slug} için ${mod.name} setting eklendi`);
          }
        } catch (err: any) {
          errorCount++;
          logger.error(
            `[healthCheck] Setting eklenemedi: ${tenant.slug} - ${mod.name} (${err.message})`,
            {
              script: "healthCheckMetaSettings",
              event: "setting.create_error",
              status: "fail",
              tenant: tenant.slug,
              module: mod.name,
            }
          );
          console.error(`[REPAIRED][ERROR] ${tenant.slug} için ${mod.name}:`, err);
        }
      }
    } catch (err: any) {
      errorCount++;
      logger.error(
        `[healthCheck] Tenant bağlantı hatası: ${tenant.slug} (${err.message})`,
        {
          script: "healthCheckMetaSettings",
          event: "tenant.conn_error",
          status: "fail",
          tenant: tenant.slug,
        }
      );
    }
  }

  // --- Sonuç ve özet log ---
  if (!repaired.length && errorCount === 0) {
    logger.info(t("sync.settingsOk", locale, translations), {
      script: "healthCheckMetaSettings",
      event: "settings.ok",
      status: "info",
    });
    console.log("Tüm meta ve settings tam, eksik yok!");
  } else {
    logger.info(
      t("sync.missingSettings", locale, translations, {
        count: repaired.length,
      }),
      {
        script: "healthCheckMetaSettings",
        event: "settings.repaired",
        status: errorCount > 0 ? "warning" : "success",
        repairedCount: repaired.length,
        errorCount,
      }
    );
    if (repaired.length) {
      console.log("Eksik eklenenler:", repaired);
    }
    if (errorCount > 0) {
      console.log(`[REPAIRED][WARN] Toplam ${errorCount} tenant/modül kaydı eklenemedi!`);
    }
  }
}

// --- CLI desteği ---
if (require.main === module) {
  (async () => {
    try {
      await healthCheckMetaSettings();
      process.exit(0);
    } catch (err: any) {
      logger.error("❌ [healthCheck] Hata oluştu:", {
        script: "healthCheckMetaSettings",
        error: err?.message || err,
      });
      console.error("❌ [healthCheck] Hata:", err);
      process.exit(1);
    }
  })();
}
