import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";

// ✅ En az bir locale key’i olan ve string/dolu olan obje kontrolü
const hasAtLeastOneLocale = (value: any) => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return (
      parsed &&
      typeof parsed === "object" &&
      SUPPORTED_LOCALES.some(
        (lang) => parsed[lang] && typeof parsed[lang] === "string" && parsed[lang].trim()
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
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// 🟢 CREATE
export const validateCreateEnsotekprod = [
  body("name")
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Name must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  body("description")
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Description must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  body("category")
    .notEmpty()
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId."),
  body("brand").notEmpty().isString().withMessage("Brand is required."),
  body("price")
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number."),
  body("stock")
    .notEmpty()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer."),
  body("stockThreshold").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("tags").optional({ checkFalsy: true }).custom(isJsonArray),
  body("color").optional({ checkFalsy: true }).custom(isJsonArray),
  body("frameMaterial").optional({ checkFalsy: true }).isString(),
  body("brakeType").optional({ checkFalsy: true }).isString(),
  body("wheelSize").optional({ checkFalsy: true }).isInt({ min: 1 }),
  body("gearCount").optional({ checkFalsy: true }).isInt({ min: 1 }),
  body("suspensionType").optional({ checkFalsy: true }).isString(),
  body("weightKg").optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body("isElectric").optional({ checkFalsy: true }).isBoolean(),
  body("batteryRangeKm").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("motorPowerW").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("isPublished").optional({ checkFalsy: true }).isBoolean(),
  validateRequest,
];

// 🟢 UPDATE
export const validateUpdateEnsotekprod = [
  body("name")
    .optional({ checkFalsy: true })
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Name must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  body("description")
    .optional({ checkFalsy: true })
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Description must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  body("category").optional({ checkFalsy: true }).isMongoId().withMessage("Category must be a valid MongoDB ObjectId."),
  body("brand").optional({ checkFalsy: true }).isString(),
  body("price").optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body("stock").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("stockThreshold").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("tags").optional({ checkFalsy: true }).custom(isJsonArray),
  body("color").optional({ checkFalsy: true }).custom(isJsonArray),
  body("frameMaterial").optional({ checkFalsy: true }).isString(),
  body("brakeType").optional({ checkFalsy: true }).isString(),
  body("wheelSize").optional({ checkFalsy: true }).isInt({ min: 1 }),
  body("gearCount").optional({ checkFalsy: true }).isInt({ min: 1 }),
  body("suspensionType").optional({ checkFalsy: true }).isString(),
  body("weightKg").optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body("isElectric").optional({ checkFalsy: true }).isBoolean(),
  body("batteryRangeKm").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("motorPowerW").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("isPublished").optional({ checkFalsy: true }).isBoolean(),
  body("removedImages")
    .optional({ checkFalsy: true })
    .custom(isJsonArray)
    .withMessage("removedImages must be a valid JSON array."),
  validateRequest,
];

// 🟢 Public Product Query (dil seçimi dinamik!)
export const validatePublicProductQuery = [
  query("category")
    .optional()
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId."),
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),
  validateRequest,
];

// 🟢 Admin Query Filters
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`),
  query("category").optional().isMongoId().withMessage("Invalid category ID."),
  query("isPublished")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage("isPublished must be boolean."),
  query("isActive")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage("isActive must be boolean."),
  validateRequest,
];
