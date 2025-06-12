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

// ✅ Dinamik locale ile isIn validator helper
const supportedLocalesMsg = `Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`;

// 🟢 ObjectId validasyonu
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// 🟢 CREATE
export const validateCreateBike = [
  body("name")
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Name must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  body("description")
    .optional()
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Description must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  body("category").notEmpty().isMongoId().withMessage("Category must be a valid MongoDB ObjectId."),
  body("brand").notEmpty().isString().withMessage("Brand is required."),
  body("price").notEmpty().isFloat({ min: 0 }).withMessage("Price must be a positive number."),
  body("stock").notEmpty().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer."),
  body("stockThreshold").optional().isInt({ min: 0 }),
  body("tags").optional().custom(isJsonArray),
  validateRequest,
];

// 🟢 UPDATE
export const validateUpdateBike = [
  body("name")
    .optional()
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Name must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  body("description")
    .optional()
    .custom(hasAtLeastOneLocale)
    .withMessage(
      `Description must be a JSON object with at least one supported locale: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  body("category").optional().isMongoId().withMessage("Category must be a valid MongoDB ObjectId."),
  body("brand").optional().isString(),
  body("price").optional().isFloat({ min: 0 }),
  body("stock").optional().isInt({ min: 0 }),
  body("stockThreshold").optional().isInt({ min: 0 }),
  body("tags").optional().custom(isJsonArray),
  body("isPublished").optional().isBoolean(),
  body("removedImages").optional().custom(isJsonArray).withMessage("removedImages must be a valid JSON array."),
  validateRequest,
];

// 🟢 Public Product Query (dil seçimi dinamik!)
export const validatePublicProductQuery = [
  query("category").optional().isMongoId().withMessage("Category must be a valid MongoDB ObjectId."),
  query("language").optional().isIn(SUPPORTED_LOCALES).withMessage(supportedLocalesMsg),
  validateRequest,
];

// 🟢 Admin Query Filters (dil seçimi dinamik!)
export const validateAdminQuery = [
  query("language").optional().isIn(SUPPORTED_LOCALES).withMessage(supportedLocalesMsg),
  query("category").optional().isMongoId().withMessage("Invalid category ID."),
  query("isPublished").optional().toBoolean().isBoolean().withMessage("isPublished must be boolean."),
  query("isActive").optional().toBoolean().isBoolean().withMessage("isActive must be boolean."),
  validateRequest,
];
