// src/core/config/envLoader.ts

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

/**
 * Merkezi env yükleyici — tenant-aware!
 *
 * - Default tenant veya CLI/script ile TENANT_NAME parametresiyle çalışır.
 * - Her ortamda i18n ve log desteğiyle fail-safe çalışır.
 * - Dummy env değerleri dev ortamı için doldurulur.
 */

const lang: SupportedLocale =
  (process.env.LOG_LOCALE as SupportedLocale) || "en";

// 1️⃣ ENV'den tenant seçimi (CLI veya APP_ENV ile)
const tenant =
  process.env.TENANT_NAME ||
  process.env.APP_ENV || // Backend ve scriptler için varsayılan
  "metahub";

const envFile = `.env.${tenant}`;
const envPath = path.resolve(process.cwd(), envFile);

// 2️⃣ ENV dosyası kontrolü ve yükleme
if (!fs.existsSync(envPath)) {
  const msg = t("env.notFound", lang, translations, { file: envFile });
  if (process.env.NODE_ENV === "production") {
    logger.error(msg, { tenant });
    throw new Error(msg);
  } else {
    logger.warn(msg + " - DEV MODE: Varsayılan env kullanılacak.", { tenant });
    // Dummy dev env — buraya projenin çalışması için minimum gerekli olan tüm değerleri ekle!
    process.env.MONGO_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/metahub";
    process.env.PORT = process.env.PORT || "5019";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
    process.env.SMTP_HOST = process.env.SMTP_HOST || "smtp.test.com";
    process.env.SMTP_USER = process.env.SMTP_USER || "test@test.com";
    process.env.SMTP_PASS = process.env.SMTP_PASS || "test";
    // ... Diğer gerekli dummy env değişkenleri burada!
  }
} else {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    const msg = t("env.loadError", lang, translations, {
      file: envFile,
      error: result.error.message,
    });
    logger.error(msg, { tenant });
    if (process.env.NODE_ENV === "production") throw result.error;
    logger.warn(
      "Dev ortamında .env hatasına rağmen dummy env ile devam ediliyor.",
      { tenant }
    );
  }
}

logger.info(t("env.loaded", lang, translations, { file: envFile }), { tenant });

// Tenant bilgisini environment'a global olarak ekle
process.env.ACTIVE_META_PROFILE = tenant;
process.env.TENANT_NAME = tenant; // (Scriptler de bunu kullanabilir!)
