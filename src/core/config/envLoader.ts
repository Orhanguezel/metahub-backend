import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

const envProfile = process.env.APP_ENV || "default";
const envFile = `.env.${envProfile}`;
const envPath = path.resolve(process.cwd(), envFile);

const lang: SupportedLocale =
  (process.env.LOG_LOCALE as SupportedLocale) || "en";

if (!fs.existsSync(envPath)) {
  logger.error(t("env.notFound", lang, translations, { file: envFile }));
  throw new Error(t("env.notFound", lang, translations, { file: envFile }));
}

dotenv.config({ path: envPath });
logger.info(t("env.loaded", lang, translations, { file: envFile }));
