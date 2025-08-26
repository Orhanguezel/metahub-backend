import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

const REQUIRE_RECAPTCHA = process.env.NODE_ENV === "production";
const MIN_TTS_MS = Number(process.env.SEC_NEWSLETTER_MIN_TTS ?? 800);

// 1️⃣ Newsletter abone olma validasyonu (güvenlik alanları eklendi)
export const validateSubscribe = [
  body("email")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.emailRequired");
    })
    .isEmail()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.emailInvalid");
    }),

  body("lang").optional().isString().isLength({ min: 2, max: 5 }),

  body("meta").optional(),

  // 🔒 Honeypot: varsa hata
  body("hp")
    .optional()
    .custom((v) => (typeof v === "string" ? v.trim().length === 0 : true))
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (k: string, p?: any) => translate(k, locale, translations, p);
      return t("security.botDetected", "Bot davranışı algılandı.");
    }),

  // 🔒 tts: çok hızlı gönderimi reddet
  body("tts")
    .optional()
    .isInt({ min: 0, max: 300000 }) // 5 dk üst sınır
    .withMessage("Invalid tts")
    .custom((v) => (typeof v === "number" ? v >= MIN_TTS_MS : true))
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (k: string, p?: any) => translate(k, locale, translations, p);
      return t("security.tooFast", "Çok hızlı gönderim tespit edildi.");
    }),

  // 🔒 reCAPTCHA token: prod’da zorunlu
  body("recaptchaToken")
    .custom((v) => (REQUIRE_RECAPTCHA ? typeof v === "string" && v.length > 10 : true))
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (k: string, p?: any) => translate(k, locale, translations, p);
      return t("security.captchaMissing", "Güvenlik doğrulaması eksik.");
    }),

  validateRequest,
];

// 2️⃣ Unsubscribe (aynı)
export const validateUnsubscribe = [
  body("email")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.emailRequired");
    })
    .isEmail()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.emailInvalid");
    }),
  validateRequest,
];

// 3️⃣ Abone id
export const validateNewsletterIdParam = [
  param("id").isMongoId().withMessage((_, { req }) => {
    const locale: SupportedLocale = req?.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);
    return t("validation.invalidId");
  }),
  validateRequest,
];

// 4️⃣ Bulk
export const validateBulkSend = [
  body("subject")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.subjectRequired");
    })
    .isLength({ min: 2, max: 140 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.subjectLength", { min: 2, max: 140 });
    }),
  body("html")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.htmlRequired");
    })
    .isString()
    .isLength({ min: 4 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.htmlLength", { min: 4 });
    }),
  body("filter").optional().isObject(),
  validateRequest,
];
