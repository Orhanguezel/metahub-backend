import "@/core/config/envLoader";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

const SETTING_FIELDS_TO_REMOVE = [
  "createdBy",
  "labelOld",
  "icon",
  "language",
  "defaultOrder",
  "defaultEnabled",
  "history",
  "statsKey",
  "routes",
  "__v",
];
const META_FIELDS_TO_REMOVE = [
  "createdBy",
  "labelOld",
  "__v",
];

const DEFAULT_LOCALE = "tr";

export async function removeSectionSettingFields() {
  // Tüm aktif tenantları çek
  const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();
  if (!tenants.length) {
    console.error("❌ Hiç aktif tenant yok!");
    process.exit(1);
  }

  // Temizlik objesi
  const settingUpdate = SETTING_FIELDS_TO_REMOVE.reduce((obj, key) => {
    obj[key] = "";
    return obj;
  }, {} as Record<string, string>);
  const metaUpdate = META_FIELDS_TO_REMOVE.reduce((obj, key) => {
    obj[key] = "";
    return obj;
  }, {} as Record<string, string>);

  let totalSettingCount = 0;
  let totalMetaCount = 0;

  // Her tenant için kendi DB'sinde temizlik yap
  for (const tenant of tenants) {
    const conn = await getTenantDbConnection(tenant.slug);
    const { SectionSetting, SectionMeta } = getTenantModelsFromConnection(conn);

    const [settingResult, metaResult] = await Promise.all([
      SectionSetting.updateMany({}, { $unset: settingUpdate }),
      SectionMeta.updateMany({}, { $unset: metaUpdate }),
    ]);

    totalSettingCount += settingResult.modifiedCount;
    totalMetaCount += metaResult.modifiedCount;

    logger.info(
      t("sync.sectionSettingFieldsRemoved", DEFAULT_LOCALE, translations, { tenant: tenant.slug, count: settingResult.modifiedCount }),
      {
        module: "removeSectionSettingFields",
        event: "sectionSetting.fieldsRemoved",
        status: "success",
        tenant: tenant.slug,
        modifiedCount: settingResult.modifiedCount,
      }
    );
    logger.info(
      t("sync.sectionMetaFieldsRemoved", DEFAULT_LOCALE, translations, { tenant: tenant.slug, count: metaResult.modifiedCount }),
      {
        module: "removeSectionSettingFields",
        event: "sectionMeta.fieldsRemoved",
        status: "success",
        tenant: tenant.slug,
        modifiedCount: metaResult.modifiedCount,
      }
    );

    console.log(
      `[${tenant.slug}] ` +
      t("sync.sectionSettingFieldsRemoved", DEFAULT_LOCALE, translations, { count: settingResult.modifiedCount })
    );
    console.log(
      `[${tenant.slug}] ` +
      t("sync.sectionMetaFieldsRemoved", DEFAULT_LOCALE, translations, { count: metaResult.modifiedCount })
    );
  }

  // Toplu özet
  logger.info(
    t("sync.sectionSettingFieldsRemovedTotal", DEFAULT_LOCALE, translations, { count: totalSettingCount }),
    {
      module: "removeSectionSettingFields",
      event: "sectionSetting.fieldsRemoved.total",
      status: "success",
      modifiedCount: totalSettingCount,
    }
  );
  logger.info(
    t("sync.sectionMetaFieldsRemovedTotal", DEFAULT_LOCALE, translations, { count: totalMetaCount }),
    {
      module: "removeSectionSettingFields",
      event: "sectionMeta.fieldsRemoved.total",
      status: "success",
      modifiedCount: totalMetaCount,
    }
  );
}

if (require.main === module) {
  (async () => {
    const mongoose = await import("mongoose");
    const MONGODB_URI =
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/metahub-db?authSource=admin";
    await mongoose.default.connect(MONGODB_URI);

    try {
      await removeSectionSettingFields();
      await mongoose.default.disconnect();
      process.exit(0);
    } catch (err) {
      console.error(
        t("sync.sectionSettingFieldsRemoveError", DEFAULT_LOCALE, translations),
        err
      );
      await mongoose.default.disconnect();
      process.exit(1);
    }
  })();
}
