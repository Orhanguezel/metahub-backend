// src/modules/product/validation.ts

import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";

// ---------- helpers ----------
const parseJson = (v: any) => {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return v; }
};

const isI18nStringObject = (value: any) => {
  const obj = parseJson(value);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return Object.keys(obj).some((k) => typeof obj[k] === "string" && obj[k].trim());
};

const isI18nStringArrayObject = (value: any) => {
  const obj = parseJson(value);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return Object.keys(obj).some((k) => Array.isArray(obj[k]));
};

const isObjectIdArray = (value: any) => {
  const v = parseJson(value);
  const arr = Array.isArray(v) ? v : (typeof v === "string" ? [v] : []);
  const re = /^[0-9a-fA-F]{24}$/;
  return arr.every((s) => typeof s === "string" && re.test(s));
};

const isDimensions = (value: any) => {
  const v = parseJson(value);
  if (v == null) return true;
  if (typeof v !== "object" || Array.isArray(v)) return false;
  for (const k of ["length","width","height"]) {
    if (v[k] != null && !(Number.isFinite(Number(v[k])) && Number(v[k]) >= 0)) return false;
  }
  if (v.unit != null && typeof v.unit !== "string") return false;
  return true;
};

const isMongoIdLoose = (value: any) => {
  if (value === "" || value === null || value === undefined) return true; // unset’e izin
  const s = String(value);
  return /^[0-9a-fA-F]{24}$/.test(s);
};

// ---------- id ----------
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ---------- CREATE ----------
export const validateCreateProduct = [
  body("title").custom(isI18nStringObject)
    .withMessage(`title must be an i18n object containing at least one of: ${SUPPORTED_LOCALES.join(", ")}.`),

  body("description").optional({ checkFalsy: true }).custom(isI18nStringObject),
  body("shortDescription").optional({ checkFalsy: true }).custom(isI18nStringObject),

  body("slug").optional({ checkFalsy: true }).custom(isI18nStringObject),

  body("tags").optional({ checkFalsy: true }).custom(isI18nStringArrayObject)
    .withMessage("tags must be an i18n object of string arrays."),

  body("seoTitle").optional({ checkFalsy: true }).custom(isI18nStringObject),
  body("seoDescription").optional({ checkFalsy: true }).custom(isI18nStringObject),
  body("seoKeywords").optional({ checkFalsy: true }).custom(isI18nStringArrayObject),

  body("categoryId").notEmpty().isMongoId().withMessage("categoryId must be a valid ObjectId."),
  body("brandId").optional({ checkFalsy: true }).isMongoId().withMessage("brandId must be a valid ObjectId."),

  // ⬇️ seller (opsiyonel) — alias sellerId | seller
  body("sellerId").optional({ checkFalsy: true }).isMongoId().withMessage("sellerId must be a valid ObjectId."),
  body("seller").optional({ checkFalsy: true }).isMongoId().withMessage("seller must be a valid ObjectId."),

  body("price").notEmpty().isFloat({ min: 0 }).withMessage("price must be a non-negative number."),
  body("salePrice").optional({ checkFalsy: true }).isFloat({ min: 0 }),

  body("rating").optional({ checkFalsy: true }).isFloat({ min: 0, max: 5 }),
  body("reviewCount").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("stock").optional({ checkFalsy: true }).isInt({ min: 0 }),

  body("status").optional().isIn(["active","draft","archived","hidden"]),
  body("visibility").optional().isIn(["public","private","hidden","draft"]),

  body("attributes").optional({ checkFalsy: true }).custom(isObjectIdArray),
  body("variants").optional({ checkFalsy: true }).custom(isObjectIdArray),

  body("options").optional({ checkFalsy: true }).custom((v) => {
    const val = parseJson(v);
    return val == null || Array.isArray(val);
  }),

  body("dimensions").optional({ checkFalsy: true }).custom(isDimensions),
  body("gallery").optional({ checkFalsy: true }).custom((v) => {
    const val = parseJson(v); return val == null || Array.isArray(val);
  }),

  body("weight").optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body("minPurchaseQty").optional({ checkFalsy: true }).isInt({ min: 1 }),
  body("maxPurchaseQty").optional({ checkFalsy: true }).isInt({ min: 1 }),

  validateRequest,
];

// ---------- UPDATE ----------
export const validateUpdateProduct = [
  body("title").optional({ checkFalsy: true }).custom(isI18nStringObject),
  body("description").optional({ checkFalsy: true }).custom(isI18nStringObject),
  body("shortDescription").optional({ checkFalsy: true }).custom(isI18nStringObject),
  body("slug").optional({ checkFalsy: true }).custom(isI18nStringObject),

  body("tags").optional({ checkFalsy: true }).custom(isI18nStringArrayObject),
  body("seoTitle").optional({ checkFalsy: true }).custom(isI18nStringObject),
  body("seoDescription").optional({ checkFalsy: true }).custom(isI18nStringObject),
  body("seoKeywords").optional({ checkFalsy: true }).custom(isI18nStringArrayObject),

  body("categoryId").optional({ checkFalsy: true }).isMongoId(),
  body("brandId").optional({ checkFalsy: true }).isMongoId(),

  // ⬇️ seller (opsiyonel set/unset): boş string/null ile temizlenebilir
  body("sellerId").optional().custom(isMongoIdLoose).withMessage("sellerId must be a valid ObjectId or empty."),
  body("seller").optional().custom(isMongoIdLoose).withMessage("seller must be a valid ObjectId or empty."),

  body("price").optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body("salePrice").optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body("rating").optional({ checkFalsy: true }).isFloat({ min: 0, max: 5 }),
  body("reviewCount").optional({ checkFalsy: true }).isInt({ min: 0 }),
  body("stock").optional({ checkFalsy: true }).isInt({ min: 0 }),

  body("status").optional().isIn(["active","draft","archived","hidden"]),
  body("visibility").optional().isIn(["public","private","hidden","draft"]),

  body("attributes").optional({ checkFalsy: true }).custom(isObjectIdArray),
  body("variants").optional({ checkFalsy: true }).custom(isObjectIdArray),
  body("options").optional({ checkFalsy: true }).custom((v) => {
    const val = parseJson(v); return val == null || Array.isArray(val);
  }),

  body("dimensions").optional({ checkFalsy: true }).custom(isDimensions),
  body("gallery").optional({ checkFalsy: true }).custom((v) => {
    const val = parseJson(v); return val == null || Array.isArray(val);
  }),
  body("removedImages").optional({ checkFalsy: true }).custom((v) => {
    const val = parseJson(v); return val == null || Array.isArray(val);
  }),

  body("weight").optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body("minPurchaseQty").optional({ checkFalsy: true }).isInt({ min: 1 }),
  body("maxPurchaseQty").optional({ checkFalsy: true }).isInt({ min: 1 }),

  validateRequest,
];

// ---------- LIST query (admin) ----------
export const validateAdminListQuery = [
  query("q").optional().isString(),
  query("categoryId").optional().isMongoId(),
  query("brandId").optional().isMongoId(),
  query("sellerId").optional().isMongoId(), // ⬅️ yeni
  query("status").optional().isIn(["active","draft","archived","hidden"]),
  query("visibility").optional().isIn(["public","private","hidden","draft"]),
  query("minPrice").optional().isFloat({ min: 0 }),
  query("maxPrice").optional().isFloat({ min: 0 }),
  query("minStock").optional().isInt({ min: 0 }),
  query("maxStock").optional().isInt({ min: 0 }),
  query("sort").optional().isIn(["created_desc","created_asc","price_asc","price_desc","stock_desc","stock_asc","rating_desc"]),
  query("page").optional().isInt({ min: 1 }),
  query("pageSize").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];
