import "@/core/config/envLoader";
import mongoose from "mongoose";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

type SeedResult = "created" | "exists" | "skippedNoMeta";

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
  } catch {
    return {};
  }
}

async function ensureMasterConnection() {
  if (mongoose.connection.readyState === 1) return;
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/metahub";
  const dbName = process.env.MONGO_DB || undefined;
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  } as any);
}

/** Tek tenant + tek modül için setting seed edip durum döndürür */
export async function seedSettingsForNewModuleOne(
  moduleName: string,
  tenant: string
): Promise<SeedResult> {
  const locale = "en";
  let conn: mongoose.Connection | null = null;

  try {
    conn = await getTenantDbConnection(tenant);
    const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);

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
      return "skippedNoMeta";
    }

    const exists = await ModuleSetting.findOne({ module: moduleName, tenant }).lean();
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
        seoTitle: { ...DEFAULT_SETTING.seoTitle },
        seoDescription: { ...DEFAULT_SETTING.seoDescription },
        seoSummary: { ...DEFAULT_SETTING.seoSummary },
        seoOgImage: DEFAULT_SETTING.seoOgImage,
      });
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
      return "created";
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
      return "exists";
    }
  } finally {
    try { await conn?.close(); } catch {}
  }
}

/** Eski public API: çoklu tenant desteği + toplam durum */
export async function seedSettingsForNewModule(
  moduleName: string,
  tenantSlug?: string
) {
  const locale = "en";
  await ensureMasterConnection();

  const tenants: string[] = tenantSlug
    ? [tenantSlug]
    : (await Tenants.find({ isActive: true }).lean())
        .map((t) => (typeof t.slug === "string" ? t.slug : ""))
        .filter(Boolean);

  let created = 0, exists = 0, skipped = 0;

  for (const tenant of tenants) {
    const res = await seedSettingsForNewModuleOne(moduleName, tenant);
    if (res === "created") created++;
    else if (res === "exists") exists++;
    else skipped++;
  }

  logger.info(
    t("sync.seedSummary", locale, translations, {
      moduleName,
      count: created,
    }),
    {
      script: "seedSettingsForNewModule",
      event: "setting.summary",
      status: "info",
      module: moduleName,
      created,
      exists,
      skipped,
      ...(tenantSlug ? { tenant: tenantSlug } : {}),
    }
  );

  return { created, exists, skipped };
}
