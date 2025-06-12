import nodemailer from "nodemailer";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// Dil belirle (profil ya da env üzerinden)
const profile = process.env.ACTIVE_META_PROFILE || process.env.APP_ENV || "en";
const lang: SupportedLocale =
  (process.env.LOG_LOCALE as SupportedLocale) || "en";

// Gerekli SMTP environment değişkenleri
const requiredVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_FROM_NAME",
];

const missingVars = requiredVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  logger.warn(
    t("smtp.missingConfig", lang, translations, {
      vars: missingVars.join(", "),
    })
  );
}

// Nodemailer transporter instance
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true", // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Bağlantı testi (opsiyonel, prod hariç)
if (process.env.NODE_ENV !== "production") {
  transporter.verify((error, success) => {
    if (error) {
      logger.error(
        t("smtp.connectionFailed", lang, translations, { error: String(error) })
      );
    } else {
      logger.info(t("smtp.connectionSuccess", lang, translations));
    }
  });
}

export { transporter };
