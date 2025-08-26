import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";

/* helpers */
const isUrl = (v: any) => typeof v === "string" && /^https?:\/\//i.test(v);
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage("validation.invalidObjectId"),
  validateRequest,
];

const CURRENCIES = ["USD","EUR","TRY","GBP"];
const PERIODS = ["monthly","yearly","once"];
const STATUSES = ["draft","active","archived"];
const PLANTYPES = ["free","basic","pro","business","enterprise"];

/* i18n plain object */
const validateMultilangField = (field: string) =>
  body(field).optional().custom((value) => {
    const obj = parseIfJson(value);
    if (obj == null) return true;
    if (typeof obj !== "object") throw new Error(`${field} must be an object`);
    for (const l of SUPPORTED_LOCALES) {
      if (obj[l] != null && typeof obj[l] !== "string") {
        throw new Error(`${field}.${l} must be string`);
      }
    }
    return true;
  });

/* i18n string array map */
const validateMultilangStringArrayField = (field: string) =>
  body(field).optional().custom((value) => {
    const obj = parseIfJson(value);
    if (obj == null) return true;
    if (typeof obj !== "object") throw new Error(`${field} must be an object`);
    for (const l of SUPPORTED_LOCALES) {
      if (obj[l] == null) continue;
      if (!Array.isArray(obj[l]) || !obj[l].every((x: any) => typeof x === "string")) {
        throw new Error(`${field}.${l} must be string[]`);
      }
    }
    return true;
  });

/* featureItems schema */
const validateFeatureItems = body("featureItems").optional().custom((value) => {
  const arr = Array.isArray(value) ? value : parseIfJson(value);
  if (arr == null) return true;
  if (!Array.isArray(arr)) throw new Error("featureItems must be an array");
  for (const it of arr) {
    if (!it || typeof it !== "object") throw new Error("featureItems[] must be object");
    if (!it.key || typeof it.key !== "string") throw new Error("featureItems[].key required");
    // label/tooltip/group are i18n objects (optional)
    for (const fld of ["label","tooltip","group"]) {
      if (it[fld] != null && typeof it[fld] !== "object") {
        throw new Error(`featureItems[].${fld} must be i18n object`);
      }
    }
    if (it.limit) {
      if (!["boolean","number","string","unlimited"].includes(it.limit.type)) {
        throw new Error("featureItems[].limit.type invalid");
      }
    }
    if (it.order != null && Number(it.order) < 0) throw new Error("featureItems[].order invalid");
  }
  return true;
});

/* tiers schema */
const validateTiers = body("tiers").optional().custom((value) => {
  const arr = Array.isArray(value) ? value : parseIfJson(value);
  if (arr == null) return true;
  if (!Array.isArray(arr)) throw new Error("tiers must be an array");
  for (const t of arr) {
    if (typeof t !== "object" || t == null) throw new Error("tiers[] must be object");
    if (typeof t.pricePerUnit !== "number" || t.pricePerUnit < 0) throw new Error("tiers[].pricePerUnit invalid");
    if (t.upTo != null && (typeof t.upTo !== "number" || t.upTo < 0)) throw new Error("tiers[].upTo invalid");
  }
  return true;
});

/* ---------- CREATE ---------- */
export const validateCreatePricing = [
  // identity
  body("code").optional().isString(),
  body("slug").optional().isString(),

  // i18n
  validateMultilangField("title"),
  validateMultilangField("description"),
  validateMultilangField("ctaLabel"),
  validateMultilangField("unitName"),
  validateMultilangStringArrayField("features"),
  validateFeatureItems,

  // urls
  body("ctaUrl").optional().custom((v)=>!v || isUrl(v)).withMessage("ctaUrl must be http(s)"),
  body("iconUrl").optional().custom((v)=>!v || isUrl(v)).withMessage("iconUrl must be http(s)"),
  body("imageUrl").optional().custom((v)=>!v || isUrl(v)).withMessage("imageUrl must be http(s)"),

  // enums & flags
  body("planType").optional().isIn(PLANTYPES),
  body("status").optional().isIn(STATUSES),
  body("isActive").optional().isBoolean().toBoolean(),
  body("isPublished").optional().isBoolean().toBoolean(),

  // pricing core
  body("price").exists().isFloat({ min: 0 }),
  body("compareAtPrice").optional().isFloat({ min: 0 }),
  body("currency").exists().isIn(CURRENCIES),
  body("period").exists().isIn(PERIODS),
  body("setupFee").optional().isFloat({ min: 0 }),
  body("priceIncludesTax").optional().isBoolean().toBoolean(),
  body("vatRate").optional().isFloat({ min: 0, max: 100 }),

  // usage-based
  body("includedUnits").optional().isFloat({ min: 0 }),
  body("pricePerUnit").optional().isFloat({ min: 0 }),
  validateTiers,

  // trial/term
  body("trialDays").optional().isInt({ min: 0 }),
  body("minTermMonths").optional().isInt({ min: 0 }),

  // targeting
  body("regions").optional(),
  body("segments").optional(),

  // scheduling
  body("publishedAt").optional().isISO8601(),
  body("effectiveFrom").optional().isISO8601(),
  body("effectiveTo").optional().isISO8601(),

  // ui flags
  body("isPopular").optional().isBoolean().toBoolean(),
  body("order").optional().isInt({ min: 0 }),

  validateRequest,
];

/* ---------- UPDATE ---------- */
export const validateUpdatePricing = [
  body("code").optional().isString(),
  body("slug").optional().isString(),

  validateMultilangField("title"),
  validateMultilangField("description"),
  validateMultilangField("ctaLabel"),
  validateMultilangField("unitName"),
  validateMultilangStringArrayField("features"),
  validateFeatureItems,

  body("ctaUrl").optional().custom((v)=>!v || isUrl(v)),
  body("iconUrl").optional().custom((v)=>!v || isUrl(v)),
  body("imageUrl").optional().custom((v)=>!v || isUrl(v)),

  body("planType").optional().isIn(PLANTYPES),
  body("status").optional().isIn(STATUSES),
  body("isActive").optional().isBoolean().toBoolean(),
  body("isPublished").optional().isBoolean().toBoolean(),

  body("price").optional().isFloat({ min: 0 }),
  body("compareAtPrice").optional().isFloat({ min: 0 }),
  body("currency").optional().isIn(CURRENCIES),
  body("period").optional().isIn(PERIODS),
  body("setupFee").optional().isFloat({ min: 0 }),
  body("priceIncludesTax").optional().isBoolean().toBoolean(),
  body("vatRate").optional().isFloat({ min: 0, max: 100 }),

  body("includedUnits").optional().isFloat({ min: 0 }),
  body("pricePerUnit").optional().isFloat({ min: 0 }),
  validateTiers,

  body("trialDays").optional().isInt({ min: 0 }),
  body("minTermMonths").optional().isInt({ min: 0 }),

  body("regions").optional(),
  body("segments").optional(),

  body("publishedAt").optional({ nullable: true }).isISO8601(),
  body("effectiveFrom").optional({ nullable: true }).isISO8601(),
  body("effectiveTo").optional({ nullable: true }).isISO8601(),

  body("isPopular").optional().isBoolean().toBoolean(),
  body("order").optional().isInt({ min: 0 }),

  validateRequest,
];

/* ---------- Admin query ---------- */
export const validateAdminQuery = [
  query("q").optional().isString(),
  query("status").optional().isIn(STATUSES),
  query("isActive").optional().toBoolean().isBoolean(),
  query("isPublished").optional().toBoolean().isBoolean(),
  query("category").optional().isString(),
  query("planType").optional().isIn(PLANTYPES),
  query("segment").optional().isString(),
  query("region").optional().isString(),
  query("onDate").optional().isISO8601(),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("page").optional().isInt({ min: 1 }),
  query("sort").optional().isString(),
  validateRequest,
];

/* ---------- Public list query ---------- */
export const validatePublicListQuery = [
  query("category").optional().isString(),
  query("planType").optional().isIn(PLANTYPES),
  query("region").optional().isString(),
  query("segment").optional().isString(),
  query("onlyPopular").optional().toBoolean().isBoolean(),
  query("onDate").optional().isISO8601(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
