// src/modules/admin/admin.validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

const labelValidator = body("label")
  .optional()
  .custom((label) => {
    if (typeof label === "string") {
      // Eğer tamamen string gelirse tüm dillere aynı atanacak.
      return true;
    }
    if (typeof label !== "object" || Array.isArray(label)) {
      throw new Error("admin.module.labelRequired"); // i18n anahtarı
    }
    // En az bir dilde dolu olmalı
    const hasAtLeastOneLocale = SUPPORTED_LOCALES.some(
      (locale) => typeof label[locale] === "string" && label[locale].trim() !== ""
    );
    if (!hasAtLeastOneLocale) {
      throw new Error("admin.module.labelRequired"); // i18n anahtarı
    }
    // Bütün mevcut locale string mi diye kontrol
    for (const locale of Object.keys(label)) {
      // <--- DÜZELTİLMİŞ TİP ATAMA
      if (
        SUPPORTED_LOCALES.includes(locale as SupportedLocale) &&
        typeof label[locale] !== "string"
      ) {
        throw new Error("admin.module.labelLocaleType"); // i18n anahtarı
      }
    }
    return true;
  });

// ➕ Modül oluşturma doğrulaması
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
  labelValidator,
  validateRequest,
];

// ✏️ Modül güncelleme doğrulaması
export const validateUpdateModule = [
  body("enabled").optional().isBoolean().withMessage("admin.module.enabledType"),
  body("visibleInSidebar")
    .optional()
    .isBoolean()
    .withMessage("admin.module.visibleInSidebarType"),
  body("useAnalytics")
    .optional()
    .isBoolean()
    .withMessage("admin.module.useAnalyticsType"),
  body("roles").optional().isArray().withMessage("admin.module.rolesType"),
  body("icon").optional().isString().withMessage("admin.module.iconType"),
  labelValidator, // update'te de aynı validatorı kullan
  validateRequest,
];

// 🔍 Modül ismi doğrulama
export const validateModuleNameParam = [
  param("name")
    .isString()
    .notEmpty()
    .withMessage("admin.module.nameParamRequired"),
  validateRequest,
];

// 🌍 Proje query doğrulama
export const validateProjectQuery = [
  query("project")
    .optional()
    .isString()
    .withMessage("admin.module.projectType"),
  validateRequest,
];
