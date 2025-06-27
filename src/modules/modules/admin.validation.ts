import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

/** Çoklu dil label validasyonu (label: { en, tr, de, ... }) */
const labelValidator = body("label")
  .optional()
  .custom((label) => {
    if (typeof label === "string") return true;
    if (typeof label !== "object" || Array.isArray(label)) {
      throw new Error("admin.module.labelRequired");
    }
    // En az bir locale dolu olmalı
    const hasAtLeastOne = SUPPORTED_LOCALES.some(
      (locale) =>
        typeof label[locale] === "string" && label[locale].trim() !== ""
    );
    if (!hasAtLeastOne) throw new Error("admin.module.labelRequired");
    // Her locale string olmalı
    for (const locale of Object.keys(label)) {
      if (
        SUPPORTED_LOCALES.includes(locale as SupportedLocale) &&
        typeof label[locale] !== "string"
      ) {
        throw new Error("admin.module.labelLocaleType");
      }
    }
    return true;
  });
// validateCreateModuleMeta
export const validateCreateModuleMeta = [
  body("name").isString().notEmpty().withMessage("admin.module.nameRequired"),
  body("icon").optional().isString().withMessage("admin.module.iconType"),
  body("roles").optional().isArray().withMessage("admin.module.rolesType"),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage("admin.module.languageInvalid"),
  body("enabled")
    .optional()
    .isBoolean()
    .withMessage("admin.module.enabledType"),
  body("label").exists().withMessage("admin.module.labelRequired"), // mutlaka olmalı
  labelValidator,
  body("version").optional().isString(),
  body("order").optional().isInt(),
  body("statsKey").optional().isString(),
  // history, routes backend'de default eklenir, validasyon gerekmez!
  validateRequest,
];

// validateUpdateModuleMeta
export const validateUpdateModuleMeta = [
  body("icon").optional().isString(),
  body("roles").optional().isArray(),
  body("language").optional().isIn(SUPPORTED_LOCALES),
  body("enabled").optional().isBoolean(),
  body("label").optional(),
  labelValidator,
  body("version").optional().isString(),
  body("order").optional().isInt(),
  body("statsKey").optional().isString(),
  // Diğer alanlara asla izin yok!
  validateRequest,
];

// validateModuleNameParam
export const validateModuleNameParam = [
  param("name")
    .isString()
    .notEmpty()
    .withMessage("admin.module.nameParamRequired"),
  validateRequest,
];

// validateTenantModuleSetting (PATCH)
export const validateTenantModuleSetting = [
  body("module").isString().notEmpty().withMessage("admin.module.nameRequired"),
  body("enabled").optional().isBoolean(),
  body("visibleInSidebar").optional().isBoolean(),
  body("useAnalytics").optional().isBoolean(),
  body("showInDashboard").optional().isBoolean(),
  body("roles").optional().isArray(),
  body("order").optional().isInt(),
  validateRequest,
];

// validateTenantParam (GET/DELETE)
export const validateTenantParam = [
  param("tenant")
    .isString()
    .notEmpty()
    .withMessage("admin.module.tenantParamRequired"),
  validateRequest,
];

// validateBatchUpdate (PATCH: batch update)
export const validateBatchUpdate = [
  body("module").isString().notEmpty(),
  body("update").isObject().notEmpty(),
  validateRequest,
];

// validateBatchAssign (POST: bir tenant'a tüm modüller)
export const validateBatchAssign = [
  body("tenant")
    .isString()
    .notEmpty()
    .withMessage("admin.module.tenantStringRequired"),
  validateRequest,
];

// validateGlobalAssign (POST: tüm tenantlara bir modül)
export const validateGlobalAssign = [
  body("module").isString().notEmpty().withMessage("admin.module.nameRequired"),
  validateRequest,
];
