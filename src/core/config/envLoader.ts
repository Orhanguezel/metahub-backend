// src/core/config/envLoader.ts

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

const lang: SupportedLocale =
  (process.env.LOG_LOCALE as SupportedLocale) || "en";

// Tenant adı env veya CLI argümanından alınır
const tenant =
  process.env.TENANT_NAME ||
  process.env.APP_ENV || // default backend env
  "metahub";

// Sadece eski kullanım/dev/test için tenant .env yükle (opsiyonel)
// Not: Prod'da tüm tenant özel ayarlar DB'den gelmeli!
const envFile = `.env.${tenant}`;
const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  const msg = t("env.notFound", lang, translations, { file: envFile });
  if (process.env.NODE_ENV === "production") {
    logger.error(msg, { tenant });
    // --- DİKKAT! Burada throw etmek yerine minimum dummy env yükle (aşağıda) ---
    // throw new Error(msg);
    logger.warn(
      "Prod ortamında tenant .env bulunamadı! Ortak env ve DB ayarları kullanılacak.",
      { tenant }
    );
  } else {
    logger.warn(msg + " - DEV MODE: Varsayılan env kullanılacak.", { tenant });
  }

  // Minimum dummy env (her ortamda fallback için)
  process.env.MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/metahub";
  process.env.PORT = process.env.PORT || "5019";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
  process.env.SMTP_HOST = process.env.SMTP_HOST || "smtp.test.com";
  process.env.SMTP_USER = process.env.SMTP_USER || "test@test.com";
  process.env.SMTP_PASS = process.env.SMTP_PASS || "test";
  // ... Diğer zorunlu env'leri buraya ekle!
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

// Aktif tenant profilini process.env'e kaydet
process.env.ACTIVE_META_PROFILE = tenant;
process.env.TENANT_NAME = tenant;
