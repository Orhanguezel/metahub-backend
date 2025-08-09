// src/modules/modules/admin.validation.ts (FINAL, i18n + logger pattern)

import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

/**
 * HELPERS
 */

// Body/path içinde tenant taşınmasını açıkça yasakla (header tek gerçek)
const forbidTenantInBody = body("tenant")
  .custom((_, { req }) => {
    const locale = req.locale || getLogLocale();
    if (typeof req.body?.tenant !== "undefined") {
      const ctx = getRequestContext(req);
     
      throw new Error(translate("admin.module.tenantNotAllowed", locale, translations));
    }
    return true;
  });

// Çoklu dil label validasyonu (label: { en, tr, de, ... } | string)
const labelValidator = body("label")
  .optional()
  .custom((label, { req }) => {
    const locale = req.locale || getLogLocale();

    if (typeof label === "string") return true;
    if (typeof label !== "object" || Array.isArray(label)) {
      throw new Error(translate("admin.module.labelRequired", locale, translations));
    }

    // En az bir locale dolu olmalı
    const hasAtLeastOne = SUPPORTED_LOCALES.some(
      (lng) => typeof (label as any)[lng] === "string" && (label as any)[lng].trim() !== ""
    );
    if (!hasAtLeastOne) {
      throw new Error(translate("admin.module.labelRequired", locale, translations));
    }

    // Her locale string olmalı
    for (const lng of Object.keys(label)) {
      if (
        SUPPORTED_LOCALES.includes(lng as SupportedLocale) &&
        typeof (label as any)[lng] !== "string"
      ) {
        throw new Error(translate("admin.module.labelLocaleType", locale, translations));
      }
    }
    return true;
  });

// Çoklu dil SEO alanı validasyonu (seoTitle, seoDescription, seoSummary)
const seoMultiLangValidator = (field: string) =>
  body(field)
    .optional()
    .custom((value, { req }) => {
      const locale = req.locale || getLogLocale();

      if (typeof value === "undefined") return true;
      if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error(translate(`admin.module.${field}Type`, locale, translations));
      }

      for (const lng of Object.keys(value)) {
        if (
          SUPPORTED_LOCALES.includes(lng as SupportedLocale) &&
          typeof (value as any)[lng] !== "string"
        ) {
          throw new Error(translate(`admin.module.${field}LocaleType`, locale, translations));
        }
      }
      return true;
    });

/**
 * META (CREATE / UPDATE)
 * Not: SEO override alanları meta'ya ASLA gelmez. Tenant da ASLA body'de gelmez.
 */

export const validateCreateModuleMeta = [
  forbidTenantInBody,
  body("name")
    .isString()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("admin.module.nameRequired", req.locale || getLogLocale(), translations)
    ),
  body("icon")
    .optional()
    .isString()
    .withMessage((_, { req }) =>
      translate("admin.module.iconType", req.locale || getLogLocale(), translations)
    ),
  body("roles")
    .optional()
    .isArray()
    .withMessage((_, { req }) =>
      translate("admin.module.rolesType", req.locale || getLogLocale(), translations)
    ),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) =>
      translate("admin.module.languageInvalid", req.locale || getLogLocale(), translations)
    ),
  body("enabled")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("admin.module.enabledType", req.locale || getLogLocale(), translations)
    ),
  body("label")
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.labelRequired", req.locale || getLogLocale(), translations)
    ),
  labelValidator,
  body("version").optional().isString(),
  body("order").optional().isInt(),
  body("statsKey").optional().isString(),
  // SEO alanları META için yasak
  body("seoTitle")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.seoNotAllowedInMeta", req.locale || getLogLocale(), translations)
    ),
  body("seoDescription")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.seoNotAllowedInMeta", req.locale || getLogLocale(), translations)
    ),
  body("seoSummary")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.seoNotAllowedInMeta", req.locale || getLogLocale(), translations)
    ),
  body("seoOgImage")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.seoNotAllowedInMeta", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

export const validateUpdateModuleMeta = [
  forbidTenantInBody,
  body("icon").optional().isString(),
  body("roles").optional().isArray(),
  body("language").optional().isIn(SUPPORTED_LOCALES),
  body("enabled").optional().isBoolean(),
  body("label").optional(),
  labelValidator,
  body("version").optional().isString(),
  body("order").optional().isInt(),
  body("statsKey").optional().isString(),
  // SEO alanları META için yasak
  body("seoTitle")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.seoNotAllowedInMeta", req.locale || getLogLocale(), translations)
    ),
  body("seoDescription")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.seoNotAllowedInMeta", req.locale || getLogLocale(), translations)
    ),
  body("seoSummary")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.seoNotAllowedInMeta", req.locale || getLogLocale(), translations)
    ),
  body("seoOgImage")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.seoNotAllowedInMeta", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

/**
 * MODULE SETTING (TENANT OVERRIDES)
 * Not: Tenant body/path ile gelmez (header zorunlu).
 */
export const validateTenantModuleSetting = [
  forbidTenantInBody,
  body("module")
    .isString()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("admin.module.nameRequired", req.locale || getLogLocale(), translations)
    ),
  body("enabled").optional().isBoolean(),
  body("visibleInSidebar").optional().isBoolean(),
  body("useAnalytics").optional().isBoolean(),
  body("showInDashboard").optional().isBoolean(),
  body("roles").optional().isArray(),
  body("order").optional().isInt(),
  // SEO override alanları:
  seoMultiLangValidator("seoTitle"),
  seoMultiLangValidator("seoDescription"),
  seoMultiLangValidator("seoSummary"),
  body("seoOgImage").optional().isString(),
  validateRequest,
];

/**
 * PARAM VALIDATION
 */
export const validateModuleNameParam = [
  param("name")
    .isString()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("admin.module.nameParamRequired", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

/**
 * Batch operations (maintenance)
 * - Header’daki tenant kullanılacağı için body'de tenant beklenmez.
 * - module zorunlu (global assign vb. için)
 */
export const validateBatchUpdate = [
  forbidTenantInBody,
  body("module")
    .isString()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("admin.module.nameRequired", req.locale || getLogLocale(), translations)
    ),
  body("update").isObject().notEmpty(),
  // Güvenlik: update objesinde tenant olamaz
  body("update.tenant")
    .not()
    .exists()
    .withMessage((_, { req }) =>
      translate("admin.module.tenantNotAllowed", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// Eski (tenant body’de zorunlu) → KALDIRILDI. Header’dan tenant alınır.
export const validateBatchAssign = [forbidTenantInBody, validateRequest];

// Global assign: body’de yalnızca module adı beklenir
export const validateGlobalAssign = [
  forbidTenantInBody,
  body("module")
    .isString()
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("admin.module.nameRequired", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];
