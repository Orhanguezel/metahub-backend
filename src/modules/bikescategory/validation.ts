import { body, param } from "express-validator";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// Ortak error handler: validasyon fail olduğunda i18n ve logger ile çalışır
export function handleValidationError(req, res, next) {
  const errors = req.validationErrors ? req.validationErrors() : [];
  if (!errors || errors.length === 0) return next();

  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  // İlk hatayı al
  const errorMsg = errors[0]?.msg || t("validation.default");

  logger.warn(errorMsg, {
    ...getRequestContext(req),
    module: "bikeCategory",
    event: "validation",
    errors,
    status: "fail"
  });

  return res.status(400).json({
    success: false,
    message: errorMsg,
    errors,
  });
}

// 🟢 ObjectId validasyonu
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((value, { req }) => {
      const locale: SupportedLocale = req.locale || getLogLocale();
      const t = (key: string) => translate(key, locale, translations);
      return t("error.invalidId");
    }),
  handleValidationError,
];

// 🟢 Create Bike Category — En az bir locale zorunlu, i18n error mesajı
export const validateCreateBikeCategory = [
  body("name").custom((value, { req }) => {
    try {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      // En az bir locale dolu ve string mi?
      return (
        obj &&
        typeof obj === "object" &&
        SUPPORTED_LOCALES.some(
          (lang) => obj[lang] && typeof obj[lang] === "string" && obj[lang].trim()
        )
      );
    } catch {
      return false;
    }
  }).withMessage((value, { req }) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    return t("validation.atLeastOneLocale");
  }),
  handleValidationError,
];

// 🟢 Update Bike Category — Diller opsiyonel, her gönderilen string olmalı
export const validateUpdateBikeCategory = [
  body("name").optional().custom((value, { req }) => {
    try {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      // Sadece gönderilen dillerde string tip kontrolü
      return (
        obj &&
        typeof obj === "object" &&
        Object.keys(obj).every(
          (lang) => SUPPORTED_LOCALES.includes(lang as any) && typeof obj[lang] === "string"
        )
      );
    } catch {
      return false;
    }
  }).withMessage((value, { req }) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    return t("validation.invalidLocales");
  }),
  handleValidationError,
];
