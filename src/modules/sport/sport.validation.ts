import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ ObjectId validasyonu (tekil kullanım için)
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Create Sport
export const validateCreateSport = [
  // Multilingual label
  body("label")
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return ["tr", "en", "de"].some((lang) => parsed[lang]?.trim());
      } catch {
        throw new Error("Label must be a valid multilingual JSON object.");
      }
    })
    .withMessage("Label must be a valid multilingual JSON object."),

  // Optional multilingual description
  body("description")
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return typeof parsed === "object";
      } catch {
        throw new Error("Description must be a valid multilingual JSON object.");
      }
    }),

  // Category (optional string)
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string."),

  // Images array (optional - required handled in file validation middleware)
  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array of strings."),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be boolean."),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean."),

  validateRequest,
];

// ✅ Update Sport
export const validateUpdateSport = [
  // Same rules as create, but all optional
  body("label")
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return typeof parsed === "object";
      } catch {
        throw new Error("Label must be a valid multilingual JSON object.");
      }
    }),

  body("description")
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return typeof parsed === "object";
      } catch {
        throw new Error("Description must be a valid multilingual JSON object.");
      }
    }),

  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string."),

  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array of strings."),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be boolean."),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean."),

  validateRequest,
];
