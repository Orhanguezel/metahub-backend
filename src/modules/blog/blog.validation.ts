import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";

// ✅ Param ID kontrolü
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Create Blog Validation (Dinamik Diller)
export const validateCreateBlog = [
  body("title")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return SUPPORTED_LOCALES.every((lang) => parsed[lang] && parsed[lang].trim());
      } catch {
        throw new Error(
          `Title must be an object or a JSON stringified object with all languages: ${SUPPORTED_LOCALES.join(", ")}`
        );
      }
    })
    .withMessage(
      `Title must be a valid JSON or object with all languages: ${SUPPORTED_LOCALES.join(", ")}`
    ),

  body("summary")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return SUPPORTED_LOCALES.every((lang) => parsed[lang] && parsed[lang].trim());
      } catch {
        throw new Error(
          `Summary must be an object or a JSON stringified object with all languages: ${SUPPORTED_LOCALES.join(", ")}`
        );
      }
    })
    .withMessage(
      `Summary must be a valid JSON or object with all languages: ${SUPPORTED_LOCALES.join(", ")}`
    ),

  body("content")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return SUPPORTED_LOCALES.every((lang) => parsed[lang] && parsed[lang].trim());
      } catch {
        throw new Error(
          `Content must be an object or a JSON stringified object with all languages: ${SUPPORTED_LOCALES.join(", ")}`
        );
      }
    })
    .withMessage(
      `Content must be a valid JSON or object with all languages: ${SUPPORTED_LOCALES.join(", ")}`
    ),

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
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          throw new Error("Tags must be a JSON array string or array.");
        }
      }
      throw new Error("Tags must be an array or a JSON stringified array.");
    }),

  validateRequest,
];

// ✅ Update Blog Validation (Dinamik Diller)
export const validateUpdateBlog = [
  body("title")
    .optional()
    .custom((v) => typeof v === "object" && SUPPORTED_LOCALES.every((lang) => v[lang]))
    .withMessage(`Title must be an object with all languages: ${SUPPORTED_LOCALES.join(", ")}`),

  body("summary")
    .optional()
    .custom((v) => typeof v === "object" && SUPPORTED_LOCALES.every((lang) => v[lang]))
    .withMessage(`Summary must be an object with all languages: ${SUPPORTED_LOCALES.join(", ")}`),

  body("content")
    .optional()
    .custom((v) => typeof v === "object" && SUPPORTED_LOCALES.every((lang) => v[lang]))
    .withMessage(`Content must be an object with all languages: ${SUPPORTED_LOCALES.join(", ")}`),

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
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
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

// ✅ Admin Query Validation (Dinamik Dil)
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(`Invalid language. Must be one of: ${SUPPORTED_LOCALES.join(", ")}`),

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
