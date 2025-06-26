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

/** Tenant dizi validasyonu (body.tenant veya tenants) */
export const tenantValidator = body("tenant")
  .optional()
  .isString()
  .notEmpty()
  .withMessage("admin.module.tenantStringRequired");

export const tenantsValidator = body("tenants")
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

/** Module body/module alanı zorunlu (ör: assign, cleanup, update) */
export const moduleNameBodyValidator = body("module")
  .isString()
  .notEmpty()
  .withMessage("admin.module.nameRequired");

/** Batch update için update alanı zorunlu */
export const updateBodyValidator = body("update")
  .isObject()
  .withMessage("admin.module.updateObjectRequired");

/** Modül oluşturma validasyonu */
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

/** Modül güncelleme validasyonu (partial) */
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

/** Paramdan modül adı */
export const validateModuleNameParam = [
  param("name")
    .isString()
    .notEmpty()
    .withMessage("admin.module.nameParamRequired"),
  validateRequest,
];

/** Query’den tenant */
export const validateTenantQuery = [
  query("tenant").optional().isString().withMessage("admin.module.tenantType"),
  validateRequest,
];

/** Modül filtreleri için (ör: enabled, analytics vs) */
export const validateModuleFilters = [
  query("visibleInSidebar").optional().isBoolean(),
  query("useAnalytics").optional().isBoolean(),
  validateRequest,
];

/** --- EKSTRA ENDPOINTLERİN VALIDASYONLARI --- */

/** Tek tenant’a tüm modüllerin atanması (body: { tenant }) */
export const validateBatchAssign = [tenantValidator, validateRequest];

/** Tüm tenantlara bir modül atanması (body: { module }) */
export const validateGlobalAssign = [moduleNameBodyValidator, validateRequest];

/** Batch update (body: { module, update }) */
export const validateBatchUpdate = [
  moduleNameBodyValidator,
  updateBodyValidator,
  validateRequest,
];

/** Belirli bir tenant parametresi (/modules/tenant/:tenant) */
export const validateTenantParam = [
  param("tenant")
    .isString()
    .notEmpty()
    .withMessage("admin.module.tenantParamRequired"),
  validateRequest,
];

/** Modül-tenant cleanup işlemleri (body: { tenant } veya { module }) */
export const validateCleanup = [
  body("tenant").optional().isString(),
  body("module").optional().isString(),
  validateRequest,
];
