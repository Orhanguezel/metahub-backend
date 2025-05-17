import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Param ID kontrolü
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Create Activity Validation
export const validateCreateActivity = [
  body("title")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return ["tr", "en", "de"].every(
          (lang) => parsed[lang] && parsed[lang].trim()
        );
      } catch {
        throw new Error("title must be an array or a JSON stringified array.");
      }
    })
    .withMessage("Title must be a valid JSON with tr, en, de."),

  body("summary")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return ["tr", "en", "de"].every(
          (lang) => parsed[lang] && parsed[lang].trim()
        );
      } catch {
        throw new Error("Summry must be an array or a JSON stringified array.");
      }
    })
    .withMessage("Summary must be a valid JSON with tr, en, de."),

  body("content")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return ["tr", "en", "de"].every(
          (lang) => parsed[lang] && parsed[lang].trim()
        );
      } catch {
        throw new Error(
          "Content must be an array or a JSON stringified array."
        );
      }
    })
    .withMessage("Content must be a valid JSON with tr, en, de."),

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

// ✅ Update Activity Validation
export const validateUpdateActivity = [
  body("title")
    .optional()
    .custom((v) => typeof v === "object")
    .withMessage("Title must be an object."),

  body("summary")
    .optional()
    .custom((v) => typeof v === "object")
    .withMessage("Summary must be an object."),

  body("content")
    .optional()
    .custom((v) => typeof v === "object")
    .withMessage("Content must be an object."),

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

// ✅ Admin Query Validation
export const validateAdminQuery = [
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
