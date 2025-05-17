import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Param ID Validation
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Common JSON Parser
const isLocalizedJson = (value: any) => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed.tr && parsed.en && parsed.de;
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

// ✅ Create Radonar Product
export const validateCreateRadonarProd = [
  body("name").custom(isLocalizedJson).withMessage("Name must be a valid JSON with tr, en, de."),
  body("description").optional().custom((v) => typeof v === "string" || typeof v === "object"),
  body("category").notEmpty().isMongoId().withMessage("Category must be a valid MongoDB ObjectId."),
  body("brand").notEmpty().isString().withMessage("Brand is required."),
  body("price").notEmpty().isFloat({ min: 0 }).withMessage("Price must be a positive number."),
  body("stock").notEmpty().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer."),
  body("stockThreshold").optional().isInt({ min: 0 }),
  body("tags").optional().custom(isJsonArray),
  validateRequest,
];

// ✅ Update Radonar Product
export const validateUpdateRadonarProd = [
  body("name").optional().custom(isLocalizedJson).withMessage("Name must be a valid JSON with tr, en, de."),
  body("description").optional().custom((v) => typeof v === "string" || typeof v === "object"),
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

// ✅ Public Product Query
export const validatePublicProductQuery = [
  query("category").optional().isMongoId().withMessage("Category must be a valid MongoDB ObjectId."),
  query("language").optional().isIn(["tr", "en", "de"]).withMessage("Language must be one of: tr, en, de."),
  validateRequest,
];

// ✅ Admin Query Filters
export const validateAdminQuery = [
  query("language").optional().isIn(["tr", "en", "de"]).withMessage("Invalid language."),
  query("category").optional().isMongoId().withMessage("Invalid category ID."),
  query("isPublished").optional().toBoolean().isBoolean().withMessage("isPublished must be boolean."),
  query("isActive").optional().toBoolean().isBoolean().withMessage("isActive must be boolean."),
  validateRequest,
];
