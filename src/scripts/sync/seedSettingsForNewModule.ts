import "@/core/config/envLoader";
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

function safeGetContext(obj: any) {
  try {
    if (obj && obj.headers) return getRequestContext(obj);
    if (obj && obj.tenant) return { tenant: obj.tenant };
    return {};
  } catch (e) {
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
        ...safeGetContext({ tenant: tenantSlug }),
      }
    );
    return;
  }

  // Tüm aktif tenantların sadece string olan slug'larını al
  const tenants: string[] = tenantSlug
    ? [tenantSlug]
    : (await Tenants.find({ isActive: true }).lean())
        .map((t) => typeof t.slug === "string" ? t.slug : "")
        .filter(Boolean);

  let count = 0;
  for (const tenant of tenants) {
    // Burada da sadece string kontrolü
    if (!tenant || typeof tenant !== "string") {
      logger.error(
        `[Seed] Tenant slug geçersiz: ${tenant}`,
        {
          module: "seedSettingsForNewModule",
          event: "invalid.tenant",
          status: "fail",
          moduleName,
        }
      );
      continue;
    }
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
