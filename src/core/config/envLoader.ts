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

// Tenant env fallbackı kaldırıldı, sadece genel env
const envFile = `.env`;
const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  const msg = t("env.notFound", lang, translations, { file: envFile });
  logger.warn(msg + " - Varsayılan dummy env ile devam ediliyor.", {});

  // Minimum dummy env (her ortamda fallback için)
  process.env.MONGO_URI = process.env.MONGO_URI;
  process.env.PORT = process.env.PORT || "5019";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
  process.env.SMTP_HOST = process.env.SMTP_HOST || "smtp.hostinger.com";
  process.env.SMTP_USER = process.env.SMTP_USER || "info@koenigsmassage.com";
  process.env.SMTP_PASS = process.env.SMTP_PASS || "Kaman@12!";
  process.env.SMTP_PORT = process.env.SMTP_PORT || "465";
  process.env.SMTP_SECURE = process.env.SMTP_SECURE || "true";

  process.env.SMTP_FROM = process.env.SMTP_FROM || "info@koenigsmassage.com";
  process.env.SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Ensotek Support";
  process.env.IMAP_HOST = process.env.IMAP_HOST || "imap.hostinger.com";
  process.env.IMAP_PORT = process.env.IMAP_PORT || "993";
  process.env.IMAP_USER = process.env.IMAP_USER || "info@koenigsmassage.com";
  process.env.IMAP_PASS = process.env.IMAP_PASS || "Kaman@12!";

  // ... Diğer zorunlu env'leri buraya ekle!
} else {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    const msg = t("env.loadError", lang, translations, {
      file: envFile,
      error: result.error.message,
    });
    logger.error(msg, {});
    logger.warn(
      "Dev ortamında .env hatasına rağmen dummy env ile devam ediliyor.",
      {}
    );
  }
}

logger.info(
  t("env.loaded", lang, translations, { file: envFile }),
  {}
);

// process.env.TENANT_NAME ve ACTIVE_META_PROFILE globalde gerekirse tek bir "default" değer atanabilir,
// ama yeni sistemde kullanımı neredeyse gereksiz:
process.env.ACTIVE_META_PROFILE = "default";
process.env.TENANT_NAME = "default";
