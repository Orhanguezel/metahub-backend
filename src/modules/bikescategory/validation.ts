// src/modules/bikecategory/validation.ts
import { body, param } from "express-validator";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { validateRequest } from "@/core/middleware/validateRequest";
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

  const errorMsg = errors[0]?.msg || t("validation.default");

  logger.warn(errorMsg, {
    ...getRequestContext(req),
    module: "bikeCategory",
    event: "validation",
    errors,
    status: "fail",
  });

  return res.status(400).json({
    success: false,
    message: errorMsg,
    errors,
  });
}

// ✅ Dinamik locale ile isIn validator helper
const supportedLocalesMsg = `Language must be one of: ${SUPPORTED_LOCALES.join(
  ", "
)}.`;

// 🟢 ObjectId validasyonu
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ En az bir locale key’i olan ve string/dolu olan obje kontrolü
const hasAtLeastOneLocale = (value: any) => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return (
      parsed &&
      typeof parsed === "object" &&
      SUPPORTED_LOCALES.some(
        (lang) =>
          parsed[lang] &&
          typeof parsed[lang] === "string" &&
          parsed[lang].trim()
      )
    );
  } catch {
    return false;
  }
};

// 🟢 Create Bike Category — en az bir locale zorunlu (tamamı gerekmiyor)
export const validateCreateBikeCategory = [
  body("name")
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Name must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(
        ", "
      )}.`
    ),
  body("description")
    .optional()
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Description must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(
        ", "
      )}.`
    ),
];

// 🟢 Update Bike Category — Alanlar opsiyonel, sadece tip kontrolü
export const validateUpdateBikeCategory = [
  body("name")
    .optional()
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Name must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(
        ", "
      )}.`
    ),
  body("description")
    .optional()
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Description must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(
        ", "
      )}.`
    ),
];
