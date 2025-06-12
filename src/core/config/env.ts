import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

const envProfile = process.env.APP_ENV || "default";
const envFile = `.env.${envProfile}`;
const envPath = path.resolve(process.cwd(), envFile);

const lang: SupportedLocale =
  (process.env.LOG_LOCALE as SupportedLocale) || "en";

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(t("env.loaded", lang, translations, { file: envFile }));
} else {
  logger.warn(t("env.notFound", lang, translations, { file: envFile }));
  const fallbackPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(fallbackPath)) {
    dotenv.config({ path: fallbackPath });
    logger.info(t("env.fallbackLoaded", lang, translations));
  } else {
    logger.warn(t("env.noFile", lang, translations));
  }
}

process.env.ACTIVE_META_PROFILE = envProfile;
logger.info(
  t("env.activeProfile", lang, translations, { profile: envProfile })
);
