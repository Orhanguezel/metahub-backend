// src/scripts/section/removeSectionSettingFields.ts
import "@/core/config/envLoader";
// ❌import mongoose from "mongoose";
import { SectionSetting, SectionMeta } from "@/modules/section/section.models";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";

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

// ARTIK connect/disconnect YOK!
export async function removeSectionSettingFields() {
  // 1️⃣ Temizlik işlemleri
  const settingUpdate = SETTING_FIELDS_TO_REMOVE.reduce((obj, key) => {
    obj[key] = "";
    return obj;
  }, {} as Record<string, string>);
  const metaUpdate = META_FIELDS_TO_REMOVE.reduce((obj, key) => {
    obj[key] = "";
    return obj;
  }, {} as Record<string, string>);

  const [settingResult, metaResult] = await Promise.all([
    SectionSetting.updateMany({}, { $unset: settingUpdate }),
    SectionMeta.updateMany({}, { $unset: metaUpdate }),
  ]);

  // 2️⃣ Logging
  logger.info(
    t("sync.sectionSettingFieldsRemoved", DEFAULT_LOCALE, translations, { count: settingResult.modifiedCount }),
    {
      module: "removeSectionSettingFields",
      event: "sectionSetting.fieldsRemoved",
      status: "success",
      modifiedCount: settingResult.modifiedCount,
    }
  );
  logger.info(
    t("sync.sectionMetaFieldsRemoved", DEFAULT_LOCALE, translations, { count: metaResult.modifiedCount }),
    {
      module: "removeSectionSettingFields",
      event: "sectionMeta.fieldsRemoved",
      status: "success",
      modifiedCount: metaResult.modifiedCount,
    }
  );

  console.log(
    t("sync.sectionSettingFieldsRemoved", DEFAULT_LOCALE, translations, { count: settingResult.modifiedCount })
  );
  console.log(
    t("sync.sectionMetaFieldsRemoved", DEFAULT_LOCALE, translations, { count: metaResult.modifiedCount })
  );
}

// 🟢 Sadece DOSYA TEK BAŞINA RUN edilirse bağlanır, zincirde asla!
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
