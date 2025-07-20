import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// --- Çoklu dil label validasyonu (label: { en, tr, de, ... }) ---
const labelValidator = body("label")
  .optional()
  .custom((label) => {
    if (typeof label === "string") return true;
    if (typeof label !== "object" || Array.isArray(label)) {
      throw new Error("admin.section.labelRequired");
    }
    const hasAtLeastOne = SUPPORTED_LOCALES.some(
      (locale) =>
        typeof label[locale] === "string" && label[locale].trim() !== ""
    );
    if (!hasAtLeastOne) throw new Error("admin.section.labelRequired");
    for (const locale of Object.keys(label)) {
      if (
        SUPPORTED_LOCALES.includes(locale as SupportedLocale) &&
        typeof label[locale] !== "string"
      ) {
        throw new Error("admin.section.labelLocaleType");
      }
    }
    return true;
  });

const descriptionValidator = body("description")
  .optional()
  .custom((desc) => {
    if (desc == null) return true;
    if (typeof desc === "string") return true;
    if (typeof desc !== "object" || Array.isArray(desc)) {
      throw new Error("admin.section.descriptionType");
    }
    for (const locale of Object.keys(desc)) {
      if (
        SUPPORTED_LOCALES.includes(locale as SupportedLocale) &&
        typeof desc[locale] !== "string"
      ) {
        throw new Error("admin.section.descriptionLocaleType");
      }
    }
    return true;
  });

// --- SectionMeta CREATE ---
export const validateCreateSectionMeta = [
  body("key").isString().notEmpty().withMessage("admin.section.keyRequired"),
  body("icon").optional().isString(),
  body("variant").optional().isString(),
  body("required").optional().isBoolean(),
  body("defaultOrder").optional().isInt(),
  body("defaultEnabled").optional().isBoolean(),
  body("roles").optional().isArray(),
  body("params").optional().isObject(),
  body("label").exists().withMessage("admin.section.labelRequired"),
  labelValidator,
  body("description").optional(),
  descriptionValidator,
  validateRequest,
];

// --- SectionMeta UPDATE ---
export const validateUpdateSectionMeta = [
  body("icon").optional().isString(),
  body("variant").optional().isString(),
  body("required").optional().isBoolean(),
  body("defaultOrder").optional().isInt(),
  body("defaultEnabled").optional().isBoolean(),
  body("roles").optional().isArray(),
  body("params").optional().isObject(),
  body("label").optional(),
  labelValidator,
  body("description").optional(),
  descriptionValidator,
  validateRequest,
];

// --- SectionMeta key param ---
export const validateMetaKeyParam = [
  param("key").isString().notEmpty().withMessage("admin.section.keyParamRequired"),
  validateRequest,
];

// --- SectionSetting CREATE ---
export const validateCreateSectionSetting = [
  body("sectionKey").isString().notEmpty().withMessage("admin.section.sectionKeyRequired"),
  body("enabled").optional().isBoolean(),
  body("order").optional().isInt(),
  body("label").optional(),
  labelValidator,
  body("description").optional(),
  descriptionValidator,
  body("variant").optional().isString(),
  body("params").optional().isObject(),
  body("roles").optional().isArray(),
  validateRequest,
];

// --- SectionSetting UPDATE ---
export const validateUpdateSectionSetting = [
  body("enabled").optional().isBoolean(),
  body("order").optional().isInt(),
  body("label").optional(),
  labelValidator,
  body("description").optional(),
  descriptionValidator,
  body("variant").optional().isString(),
  body("params").optional().isObject(),
  body("roles").optional().isArray(),
  validateRequest,
];

// --- SectionSetting sectionKey param ---
export const validateSectionSettingKeyParam = [
  param("sectionKey").isString().notEmpty().withMessage("admin.section.sectionKeyParamRequired"),
  validateRequest,
];

// --- Tenant param (opsiyonel) ---
export const validateTenantParam = [
  param("tenant")
    .isString()
    .notEmpty()
    .withMessage("admin.section.tenantParamRequired"),
  validateRequest,
];

