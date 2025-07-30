import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

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

// ✅ JSON Array Parser
const isJsonArray = (value: any) => {
  if (Array.isArray(value)) return true;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  }
  return false;
};

// 🟢 ObjectId validasyonu
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// 🟢 CREATE
export const validateCreateSparepart = [
  body("name")
    .custom(hasAtLeastOneLocale)
    .withMessage((_, { req }) =>
      translate(
        "validation.nameLocale",
        req.locale || getLogLocale(),
        translations,
        { locales: SUPPORTED_LOCALES.join(", ") }
      )
    ),
  body("description")
    .custom(hasAtLeastOneLocale)
    .withMessage((_, { req }) =>
      translate(
        "validation.descriptionLocale",
        req.locale || getLogLocale(),
        translations,
        { locales: SUPPORTED_LOCALES.join(", ") }
      )
    ),
  body("category")
    .notEmpty()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.categoryObjectId", req.locale || getLogLocale(), translations)
    ),
  body("brand")
    .notEmpty()
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.brandRequired", req.locale || getLogLocale(), translations)
    ),
  body("price")
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.pricePositive", req.locale || getLogLocale(), translations)
    ),
  body("stock")
    .notEmpty()
    .isInt({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.stockNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("stockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.stockThresholdNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("tags")
    .optional()
    .custom(isJsonArray)
    .withMessage((_, { req }) =>
      translate("validation.tagsArray", req.locale || getLogLocale(), translations)
    ),
  body("color")
    .optional()
    .custom(isJsonArray)
    .withMessage((_, { req }) =>
      translate("validation.colorArray", req.locale || getLogLocale(), translations)
    ),
  body("frameMaterial")
    .optional()
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.frameMaterialString", req.locale || getLogLocale(), translations)
    ),
  body("brakeType")
    .optional()
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.brakeTypeString", req.locale || getLogLocale(), translations)
    ),
  body("wheelSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.wheelSizePositive", req.locale || getLogLocale(), translations)
    ),
  body("gearCount")
    .optional()
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.gearCountPositive", req.locale || getLogLocale(), translations)
    ),
  body("suspensionType")
    .optional()
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.suspensionTypeString", req.locale || getLogLocale(), translations)
    ),
  body("weightKg")
    .optional()
    .isFloat({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.weightNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("isElectric")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.isElectricBoolean", req.locale || getLogLocale(), translations)
    ),
  body("batteryRangeKm")
    .optional()
    .isInt({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.batteryRangeNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("motorPowerW")
    .optional()
    .isInt({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.motorPowerNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.isPublishedBoolean", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// 🟢 UPDATE
export const validateUpdateSparepart = [
  body("name")
    .optional()
    .custom(hasAtLeastOneLocale)
    .withMessage((_, { req }) =>
      translate(
        "validation.nameLocale",
        req.locale || getLogLocale(),
        translations,
        { locales: SUPPORTED_LOCALES.join(", ") }
      )
    ),
  body("description")
    .optional()
    .custom(hasAtLeastOneLocale)
    .withMessage((_, { req }) =>
      translate(
        "validation.descriptionLocale",
        req.locale || getLogLocale(),
        translations,
        { locales: SUPPORTED_LOCALES.join(", ") }
      )
    ),
  body("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.categoryObjectId", req.locale || getLogLocale(), translations)
    ),
  body("brand")
    .optional()
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.brandRequired", req.locale || getLogLocale(), translations)
    ),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.pricePositive", req.locale || getLogLocale(), translations)
    ),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.stockNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("stockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.stockThresholdNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("tags")
    .optional()
    .custom(isJsonArray)
    .withMessage((_, { req }) =>
      translate("validation.tagsArray", req.locale || getLogLocale(), translations)
    ),
  body("color")
    .optional()
    .custom(isJsonArray)
    .withMessage((_, { req }) =>
      translate("validation.colorArray", req.locale || getLogLocale(), translations)
    ),
  body("frameMaterial")
    .optional()
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.frameMaterialString", req.locale || getLogLocale(), translations)
    ),
  body("brakeType")
    .optional()
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.brakeTypeString", req.locale || getLogLocale(), translations)
    ),
  body("wheelSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.wheelSizePositive", req.locale || getLogLocale(), translations)
    ),
  body("gearCount")
    .optional()
    .isInt({ min: 1 })
    .withMessage((_, { req }) =>
      translate("validation.gearCountPositive", req.locale || getLogLocale(), translations)
    ),
  body("suspensionType")
    .optional()
    .isString()
    .withMessage((_, { req }) =>
      translate("validation.suspensionTypeString", req.locale || getLogLocale(), translations)
    ),
  body("weightKg")
    .optional()
    .isFloat({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.weightNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("isElectric")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.isElectricBoolean", req.locale || getLogLocale(), translations)
    ),
  body("batteryRangeKm")
    .optional()
    .isInt({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.batteryRangeNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("motorPowerW")
    .optional()
    .isInt({ min: 0 })
    .withMessage((_, { req }) =>
      translate("validation.motorPowerNonNegative", req.locale || getLogLocale(), translations)
    ),
  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.isPublishedBoolean", req.locale || getLogLocale(), translations)
    ),
  body("removedImages")
    .optional()
    .custom(isJsonArray)
    .withMessage((_, { req }) =>
      translate("validation.removedImagesArray", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// 🟢 Public Product Query (dil seçimi dinamik!)
export const validatePublicProductQuery = [
  query("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.categoryObjectId", req.locale || getLogLocale(), translations)
    ),
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) =>
      translate(
        "validation.languageAllowed",
        req.locale || getLogLocale(),
        translations,
        { locales: SUPPORTED_LOCALES.join(", ") }
      )
    ),
  validateRequest,
];

// 🟢 Admin Query Filters
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) =>
      translate(
        "validation.languageAllowed",
        req.locale || getLogLocale(),
        translations,
        { locales: SUPPORTED_LOCALES.join(", ") }
      )
    ),
  query("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.categoryObjectId", req.locale || getLogLocale(), translations)
    ),
  query("isPublished")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.isPublishedBoolean", req.locale || getLogLocale(), translations)
    ),
  query("isActive")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.isActiveBoolean", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];
