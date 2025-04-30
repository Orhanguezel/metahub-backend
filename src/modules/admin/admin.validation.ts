// src/modules/admin/admin.validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ➕ Modül oluşturma doğrulaması
export const validateCreateModule = [
  body("name").isString().notEmpty().withMessage("Module name is required."),
  body("icon").optional().isString().withMessage("Icon must be a string."),
  body("roles").optional().isArray().withMessage("Roles must be an array."),
  body("language").optional().isIn(["tr", "en", "de"]).withMessage("Language must be 'tr', 'en', or 'de'."),
  body("visibleInSidebar").optional().isBoolean().withMessage("visibleInSidebar must be a boolean."),
  body("useAnalytics").optional().isBoolean().withMessage("useAnalytics must be a boolean."),
  body("enabled").optional().isBoolean().withMessage("enabled must be a boolean."),
  validateRequest,
];

// ✏️ Modül güncelleme doğrulaması
export const validateUpdateModule = [
  body("enabled").optional().isBoolean().withMessage("enabled must be boolean."),
  body("visibleInSidebar").optional().isBoolean().withMessage("visibleInSidebar must be boolean."),
  body("useAnalytics").optional().isBoolean().withMessage("useAnalytics must be boolean."),
  body("roles").optional().isArray().withMessage("roles must be an array."),
  body("icon").optional().isString().withMessage("icon must be a string."),
  body("label.tr").optional().isString().withMessage("label.tr must be a string."),
  body("label.en").optional().isString().withMessage("label.en must be a string."),
  body("label.de").optional().isString().withMessage("label.de must be a string."),
  validateRequest,
];

// 🔍 Modül ismi doğrulama
export const validateModuleNameParam = [
  param("name")
    .isString()
    .notEmpty()
    .withMessage("Module name parameter is required."),
  validateRequest,
];

// 🌍 Proje query doğrulama
export const validateProjectQuery = [
  query("project")
    .optional()
    .isString()
    .withMessage("Project must be a string."),
  validateRequest,
];
