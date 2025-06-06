import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Param ID kontrolü
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Create Apartment Validation
export const validateCreateApartment = [
  body("title")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return ["tr", "en", "de"].some((lang) => parsed[lang]?.trim());
      } catch {
        throw new Error("Title must be a valid JSON with tr, en, de.");
      }
    })
    .withMessage("Title must be a valid multilingual JSON object."),

  body("description")
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return ["tr", "en", "de"].some((lang) => parsed[lang]?.trim());
      } catch {
        throw new Error("Description must be a valid multilingual JSON object.");
      }
    }),

  body("category")
    .optional()
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId."),

  body("tags")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") {
        try {
          return Array.isArray(JSON.parse(value));
        } catch {
          throw new Error("Tags must be a JSON array string or array.");
        }
      }
      throw new Error("Tags must be an array or a JSON stringified array.");
    }),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be true or false."),

  body("publishedAt")
    .optional()
    .isISO8601()
    .withMessage("publishedAt must be a valid ISO8601 date."),

  validateRequest,
];

// ✅ Update Apartment Validation
export const validateUpdateApartment = [
  body("title")
    .optional()
    .custom((v) => typeof v === "object")
    .withMessage("Title must be an object."),

  body("description")
    .optional()
    .custom((v) => typeof v === "object")
    .withMessage("Description must be an object."),

  body("category")
    .optional()
    .isMongoId()
    .withMessage("Category must be a valid MongoDB ObjectId."),

  body("tags")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") {
        try {
          return Array.isArray(JSON.parse(value));
        } catch {
          throw new Error("Tags must be a JSON array string or array.");
        }
      }
      throw new Error("Tags must be an array or a JSON stringified array.");
    }),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be true or false."),

  body("publishedAt")
    .optional()
    .isISO8601()
    .withMessage("publishedAt must be a valid ISO8601 date."),

  validateRequest,
];

// ✅ Admin Query Validation
export const validateAdminApartmentQuery = [
  query("language")
    .optional()
    .isIn(["tr", "en", "de"])
    .withMessage("Invalid language."),

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
