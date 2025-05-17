import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Param ID kontrolü
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Create EnsotekProd Validation
export const validateCreateEnsotekProd = [
  body("name")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return parsed.tr && parsed.en && parsed.de;
      } catch {
        return false;
      }
    })
    .withMessage("Name must be a valid JSON with tr, en, de."),

  body("description")
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return typeof parsed === "object";
      } catch {
        return false;
      }
    })
    .withMessage("Description must be a valid JSON object."),

  body("category")
    .notEmpty()
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId."),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number."),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer."),

  body("stockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock threshold must be a non-negative integer."),

  body("tags")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          throw new Error("Tags must be a valid JSON array.");
        }
      }
      return false;
    }),

  validateRequest,
];

// ✅ Update EnsotekProd Validation
export const validateUpdateEnsotekProd = [
  body("name")
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return parsed.tr && parsed.en && parsed.de;
      } catch {
        return false;
      }
    })
    .withMessage("Name must be a valid JSON with tr, en, de."),

  body("description")
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return typeof parsed === "object";
      } catch {
        return false;
      }
    })
    .withMessage("Description must be a valid JSON object."),

  body("category")
    .optional()
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId."),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number."),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer."),

  body("stockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock threshold must be a non-negative integer."),

  body("tags")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          throw new Error("Tags must be a valid JSON array.");
        }
      }
      return false;
    }),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be true or false."),

  body("removedImages")
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed);
      } catch {
        throw new Error("removedImages must be a valid JSON array.");
      }
    }),

  validateRequest,
];


// ✅ Public Query Validation
export const validatePublicProductQuery = [
  query("category")
    .optional()
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId."),

  query("language")
    .optional()
    .isIn(["tr", "en", "de"])
    .withMessage("Language must be one of: tr, en, de."),

  validateRequest,
];

// ✅ Admin Query Validation
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(["tr", "en", "de"])
    .withMessage("Invalid language."),

  query("category")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID."),

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
