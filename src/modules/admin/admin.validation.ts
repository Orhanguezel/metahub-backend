import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

/**
 * Çoklu dil label validasyonu.
 * - label: string (tüm dillere aynı atanır) veya
 * - label: { [locale]: string } (en az bir dilde zorunlu)
 */
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

/**
 * tenants alanı: dizi, her bir öğe string ve boş değil
 */
const tenantsValidator = body("tenants")
  .optional()
  .isArray({ min: 1 })
  .withMessage("admin.module.tenantsType")
  .custom((tenants) => {
    if (!Array.isArray(tenants)) return false;
    if (tenants.some((t) => typeof t !== "string" || !t.trim())) {
      throw new Error("admin.module.tenantStringRequired");
    }
    return true;
  });

/**
 * Modül oluşturma validasyonu (tüm alanlar)
 */
export const validateCreateModule = [
  body("name").isString().notEmpty().withMessage("admin.module.nameRequired"),
  body("icon").optional().isString().withMessage("admin.module.iconType"),
  body("roles").optional().isArray().withMessage("admin.module.rolesType"),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage("admin.module.languageInvalid"),
  body("visibleInSidebar")
    .optional()
    .isBoolean()
    .withMessage("admin.module.visibleInSidebarType"),
  body("useAnalytics")
    .optional()
    .isBoolean()
    .withMessage("admin.module.useAnalyticsType"),
  body("enabled")
    .optional()
    .isBoolean()
    .withMessage("admin.module.enabledType"),
  body("showInDashboard")
    .optional()
    .isBoolean()
    .withMessage("admin.module.showInDashboardType"),
  body("order").optional().isInt().withMessage("admin.module.orderType"),
  tenantsValidator,
  labelValidator,
  validateRequest,
];

/**
 * Modül güncelleme validasyonu (partial field desteği)
 */
export const validateUpdateModule = [
  body("name").optional().isString(),
  body("icon").optional().isString().withMessage("admin.module.iconType"),
  body("roles").optional().isArray().withMessage("admin.module.rolesType"),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage("admin.module.languageInvalid"),
  body("visibleInSidebar")
    .optional()
    .isBoolean()
    .withMessage("admin.module.visibleInSidebarType"),
  body("useAnalytics")
    .optional()
    .isBoolean()
    .withMessage("admin.module.useAnalyticsType"),
  body("enabled")
    .optional()
    .isBoolean()
    .withMessage("admin.module.enabledType"),
  body("showInDashboard")
    .optional()
    .isBoolean()
    .withMessage("admin.module.showInDashboardType"),
  body("order").optional().isInt().withMessage("admin.module.orderType"),
  tenantsValidator,
  labelValidator,
  validateRequest,
];

/**
 * Modül ismi param validasyonu (routes/:name)
 */
export const validateModuleNameParam = [
  param("name")
    .isString()
    .notEmpty()
    .withMessage("admin.module.nameParamRequired"),
  validateRequest,
];

/**
 * Tenant query validasyonu (opsiyonel)
 */
export const validateTenantQuery = [
  query("tenant").optional().isString().withMessage("admin.module.tenantType"),
  validateRequest,
];

/**
 * (Opsiyonel) Modül filtreleri için
 */
export const validateModuleFilters = [
  query("visibleInSidebar").optional().isBoolean(),
  query("useAnalytics").optional().isBoolean(),
  validateRequest,
];
