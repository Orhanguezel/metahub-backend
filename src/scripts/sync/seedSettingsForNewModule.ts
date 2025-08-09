import "@/core/config/envLoader";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

// Çoklu dil SEO field'ları için boş obje
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

function safeGetContext(obj: any) {
  try {
    if (obj && obj.headers) return getRequestContext(obj);
    if (obj && obj.tenant) return { tenant: obj.tenant };
    return {};
  } catch (e) {
    return {};
  }
}

/**
 * Her tenant+modül için eksik setting'i ekler.
 * SEO override field'larını da ekler.
 */
export async function seedSettingsForNewModule(
  moduleName: string,
  tenantSlug?: string
) {
  const locale = "en";
  // 1️⃣ Tenant listesini hazırla
  const tenants: string[] = tenantSlug
    ? [tenantSlug]
    : (await Tenants.find({ isActive: true }).lean())
        .map((t) => typeof t.slug === "string" ? t.slug : "")
        .filter(Boolean);

  let count = 0;
  for (const tenant of tenants) {
    try {
      // 2️⃣ O tenant için bağlantı aç, modelleri çek
      const conn = await getTenantDbConnection(tenant);
      const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

      // 3️⃣ Tenant+module meta var mı?
      const mod = await ModuleMeta.findOne({ name: moduleName, tenant }).lean();
      if (!mod) {
        logger.error(
          t("sync.moduleNotFound", locale, translations, { moduleName, tenant }),
          {
            script: "seedSettingsForNewModule",
            event: "module.notfound",
            status: "fail",
            tenant,
            module: moduleName,
            ...safeGetContext({ tenant }),
          }
        );
        continue;
      }

      // 4️⃣ Setting var mı?
      const exists = await ModuleSetting.findOne({ module: moduleName, tenant });
      if (!exists) {
        await ModuleSetting.create({
          module: mod.name,
          tenant,
          enabled: mod.enabled ?? DEFAULT_SETTING.enabled,
          visibleInSidebar: DEFAULT_SETTING.visibleInSidebar,
          useAnalytics: DEFAULT_SETTING.useAnalytics,
          showInDashboard: DEFAULT_SETTING.showInDashboard,
          roles: Array.isArray(mod.roles) ? mod.roles : DEFAULT_SETTING.roles,
          order: typeof mod.order === "number" ? mod.order : DEFAULT_SETTING.order,
          // SEO override alanları
          seoTitle: { ...DEFAULT_SETTING.seoTitle },
          seoDescription: { ...DEFAULT_SETTING.seoDescription },
          seoSummary: { ...DEFAULT_SETTING.seoSummary },
          seoOgImage: DEFAULT_SETTING.seoOgImage,
        });
        count++;
        logger.info(
          t("sync.settingCreated", locale, translations, { moduleName, tenant }),
          {
            script: "seedSettingsForNewModule",
            event: "setting.created",
            status: "success",
            tenant,
            module: moduleName,
            ...safeGetContext({ tenant }),
          }
        );
      } else {
        logger.info(
          t("sync.settingExists", locale, translations, { moduleName, tenant }),
          {
            script: "seedSettingsForNewModule",
            event: "setting.exists",
            status: "warning",
            tenant,
            module: moduleName,
            ...safeGetContext({ tenant }),
          }
        );
      }
    } catch (err: any) {
      logger.error(
        `[Seed][ERROR] ${moduleName} → ${tenant}: ${err.message || err}`,
        {
          script: "seedSettingsForNewModule",
          event: "exception",
          status: "fail",
          module: moduleName,
          tenant,
        }
      );
    }
  }

  logger.info(
    t("sync.seedSummary", locale, translations, { moduleName, count }),
    {
      script: "seedSettingsForNewModule",
      event: "setting.summary",
      status: "info",
      module: moduleName,
      count,
      ...(tenantSlug ? { tenant: tenantSlug } : {}),
    }
  );
}
