import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

// helpers
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

// Create (Admin)
export const validateCreateContact = [
  body("kind")
    .exists()
    .isIn(["person", "organization"])
    .withMessage((_, { req }) =>
      translate("validation.invalidKind", req.locale || getLogLocale(), translations)
    ),

  // identity rules
  body().custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (req.body.kind === "person") {
      if (!(req.body.firstName || req.body.lastName)) throw new Error(t("validation.personNameRequired"));
    } else {
      if (!(req.body.legalName || req.body.tradeName)) throw new Error(t("validation.orgNameRequired"));
    }
    return true;
  }),

  // Optional basic fields
  body("slug").optional().isString().trim(),

  // Arrays
  body("emails").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) return true; // optional
    const ok = arr.every((e: any) => !e || typeof e.value === "string");
    if (!ok) throw new Error(translate("validation.invalidEmails", req.locale || getLogLocale(), translations));
    return true;
  }),
  body("phones").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) return true;
    const ok = arr.every((p: any) => !p || typeof p.value === "string");
    if (!ok) throw new Error(translate("validation.invalidPhones", req.locale || getLogLocale(), translations));
    return true;
  }),
  body("addresses").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) return true;
    const ok = arr.every((a: any) => !a || typeof a === "object");
    if (!ok) throw new Error(translate("validation.invalidAddresses", req.locale || getLogLocale(), translations));
    return true;
  }),
  body("billing").optional().custom((val, { req }) => {
    const b = parseIfJson(val);
    if (b && typeof b !== "object") {
      throw new Error(translate("validation.invalidBilling", req.locale || getLogLocale(), translations));
    }
    if (b?.defaultDueDayOfMonth && (b.defaultDueDayOfMonth < 1 || b.defaultDueDayOfMonth > 28)) {
      throw new Error(translate("validation.invalidDueDay", req.locale || getLogLocale(), translations));
    }
    return true;
  }),

  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),

  validateRequest,
];

// Update (Admin)
export const validateUpdateContact = [
  body("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    translate("validation.invalidKind", req.locale || getLogLocale(), translations)
  ),
  body("slug").optional().isString().trim(),
  body("firstName").optional().isString(),
  body("lastName").optional().isString(),
  body("legalName").optional().isString(),
  body("tradeName").optional().isString(),

  body("emails").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(translate("validation.invalidEmails", req.locale || getLogLocale(), translations));
    const ok = arr.every((e: any) => !e || typeof e.value === "string");
    if (!ok) throw new Error(translate("validation.invalidEmails", req.locale || getLogLocale(), translations));
    return true;
  }),
  body("phones").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(translate("validation.invalidPhones", req.locale || getLogLocale(), translations));
    const ok = arr.every((p: any) => !p || typeof p.value === "string");
    if (!ok) throw new Error(translate("validation.invalidPhones", req.locale || getLogLocale(), translations));
    return true;
  }),
  body("addresses").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(translate("validation.invalidAddresses", req.locale || getLogLocale(), translations));
    const ok = arr.every((a: any) => !a || typeof a === "object");
    if (!ok) throw new Error(translate("validation.invalidAddresses", req.locale || getLogLocale(), translations));
    return true;
  }),
  body("billing").optional().custom((val, { req }) => {
    const b = parseIfJson(val);
    if (b && typeof b !== "object") {
      throw new Error(translate("validation.invalidBilling", req.locale || getLogLocale(), translations));
    }
    if (b?.defaultDueDayOfMonth && (b.defaultDueDayOfMonth < 1 || b.defaultDueDayOfMonth > 28)) {
      throw new Error(translate("validation.invalidDueDay", req.locale || getLogLocale(), translations));
    }
    return true;
  }),

  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),

  validateRequest,
];

// Admin Query
export const validateContactsAdminQuery = [
  query("q").optional().isString().trim(),
  query("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    translate("validation.invalidKind", req.locale || getLogLocale(), translations)
  ),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

// Public Query
export const validateContactsPublicQuery = [
  query("q").optional().isString().trim(),
  query("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    translate("validation.invalidKind", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];
