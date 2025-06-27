import "@/core/config/envLoader";
import mongoose from "mongoose";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";

const DEFAULT_SETTING = {
  enabled: true,
  visibleInSidebar: true,
  useAnalytics: false,
  showInDashboard: true,
  roles: ["admin"],
  order: 0,
};

// --- Context guard: Eğer CLI veya seed call ise, güvenli şekilde tenant info ekle ---
function safeGetContext(obj: any) {
  try {
    // Express req nesnesi mi? headers varsa
    if (obj && obj.headers) return getRequestContext(obj);
    // Değilse sadece tenant parametresini ekle
    if (obj && obj.tenant) return { tenant: obj.tenant };
    // Parametresiz ise boş obje
    return {};
  } catch (e) {
    // Her ihtimale karşı hata durumunda context ekleme
    return {};
  }
}

export async function seedSettingsForNewModule(
  moduleName: string,
  tenantSlug?: string
) {
  const locale = "en";
  const mod = await ModuleMeta.findOne({ name: moduleName }).lean();
  if (!mod) {
    logger.error(
      t("sync.moduleNotFound", locale, translations, { moduleName }),
      {
        module: "seedSettingsForNewModule",
        event: "module.notfound",
        status: "fail",
        ...safeGetContext({ tenant: tenantSlug }), // Sadece tenant parametresi logda yer alsın
      }
    );
    return;
  }

  const tenants: string[] = tenantSlug
    ? [tenantSlug]
    : (await Tenants.find({ isActive: true })).map((t) => t.slug);

  let count = 0;
  for (const tenant of tenants) {
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
        order:
          typeof mod.order === "number" ? mod.order : DEFAULT_SETTING.order,
      });
      count++;
      logger.info(
        t("sync.settingCreated", locale, translations, { moduleName, tenant }),
        {
          module: "seedSettingsForNewModule",
          event: "setting.created",
          status: "success",
          tenant,
          ...safeGetContext({ tenant }),
        }
      );
    } else {
      logger.info(
        t("sync.settingExists", locale, translations, { moduleName, tenant }),
        {
          module: "seedSettingsForNewModule",
          event: "setting.exists",
          status: "warning",
          tenant,
          ...safeGetContext({ tenant }),
        }
      );
    }
  }
  logger.info(
    t("sync.seedSummary", locale, translations, { moduleName, count }),
    {
      module: "seedSettingsForNewModule",
      event: "setting.summary",
      status: "info",
      count,
      ...safeGetContext({ tenant: tenantSlug }),
    }
  );
}
