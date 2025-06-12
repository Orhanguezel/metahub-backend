import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { connectDB } from "@/core/config/connect";
import { ModuleSetting } from "@/modules/admin";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// Tek satırda standart log dili
const langEnv = process.env.LOG_LOCALE as SupportedLocale;
const lang: SupportedLocale = SUPPORTED_LOCALES.includes(langEnv)
  ? langEnv
  : "en";

const envProfile = process.env.APP_ENV;
if (!envProfile) {
  const msg =
    t("migration.noAppEnv", lang, translations) ||
    "❌ APP_ENV is not defined. Please set it before running this script.";
  logger.error(msg);
  throw new Error(msg);
}

const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (!fs.existsSync(envPath)) {
  const msg =
    t("migration.envNotFound", lang, translations, { envPath }) ||
    `❌ Environment file not found: ${envPath}`;
  logger.error(msg);
  throw new Error(msg);
}

dotenv.config({ path: envPath });
logger.info(
  t("migration.envLoaded", lang, translations, { envPath }) ||
    `🌱 Loaded env from: ${envPath}`
);

const runMigration = async () => {
  await connectDB();

  const allModules = await ModuleSetting.find();

  for (const mod of allModules) {
    if (typeof mod.label === "string") {
      const newLabel = {
        tr: mod.label,
        en: mod.label,
        de: mod.label,
      };

      mod.label = newLabel as any;

      await mod.save();
      logger.info(
        t("migration.migrated", lang, translations, { module: mod.module }) ||
          `✅ Migrated: ${mod.module}`
      );
    } else {
      logger.info(
        t("migration.alreadyMigrated", lang, translations, {
          module: mod.module,
        }) || `✔️ Already migrated: ${mod.module}`
      );
    }
  }

  mongoose.connection.close();
};

runMigration().catch((err) => {
  logger.error(
    t("migration.error", lang, translations, { error: String(err) }) ||
      `❌ Migration error: ${err}`
  );
  mongoose.connection.close();
});
