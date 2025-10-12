import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const isHexId = (s: any) => /^[0-9a-fA-F]{24}$/.test(String(s));

const tMsg = (key: string, req: any) =>
  translate(key, req.locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

/** string | csv | json → string[] (trim) */
const coerceToArrayOfStrings = (val: any): string[] => {
  const parsed = parseIfJson(val);
  if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
  if (typeof parsed === "string") {
    if (parsed.trim().startsWith("[")) {
      try {
        const arr = JSON.parse(parsed);
        return Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
      } catch { /* fallthrough */ }
    }
    return parsed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (parsed == null) return [];
  return [String(parsed).trim()].filter(Boolean);
};

/** categories ortak doğrulayıcı */
const categoriesValidator = (arr: any, { req }: any, { required = false } = {}) => {
  const list: string[] = Array.isArray(arr) ? arr : coerceToArrayOfStrings(arr);
  if (required && !list.length) {
    throw new Error(tMsg("seller.validation.categoriesRequired", req) || "categories_required");
  }
  if (list.length && !list.every(isHexId)) {
    throw new Error(tMsg("seller.validation.categoriesMustBeObjectIdArray", req) || "categories_invalid");
  }
  return true;
};

export const validateSellerIdParam = [
  param("id").isMongoId().withMessage((_, { req }) => tMsg("seller.validation.invalidObjectId", req)),
  validateRequest,
];

/** Admin list query */
export const sellersAdminQueryValidator = [
  query("q").optional().isString().trim(),
  query("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    tMsg("seller.validation.kindInvalid", req)
  ),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tMsg("seller.validation.booleanField", req)
  ),
  validateRequest,
];

/** Create (Admin) */
export const createSellerValidator = [
  body("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    tMsg("seller.validation.kindInvalid", req)
  ),
  body("companyName").optional().isString(),
  body("contactName").optional().isString(),
  body("email").optional().isEmail(),
  body("phone").optional().isString(),

  body("userRef").optional().isMongoId().withMessage((_, { req }) =>
    tMsg("seller.validation.invalidObjectId", req)
  ),

  body("slug").optional().isString().trim(),

  body("billing").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    if (!val) return true;
    if (typeof val !== "object") throw new Error(tMsg("seller.validation.invalidBilling", req));
    if (val.defaultCurrency && !["USD", "EUR", "TRY"].includes(val.defaultCurrency))
      throw new Error(tMsg("seller.validation.invalidCurrency", req));
    if (val.paymentTermDays !== undefined && (typeof val.paymentTermDays !== "number" || val.paymentTermDays < 0 || val.paymentTermDays > 365))
      throw new Error(tMsg("seller.validation.invalidPaymentTerm", req));
    if (val.defaultDueDayOfMonth !== undefined && (val.defaultDueDayOfMonth < 1 || val.defaultDueDayOfMonth > 28))
      throw new Error(tMsg("seller.validation.invalidDueDay", req));
    return true;
  }),

  body("addresses").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(tMsg("seller.validation.addressesMustBeArray", req));
    return true;
  }),

  body("tags").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(tMsg("seller.validation.tagsMustBeArray", req));
    const ok = arr.every((x) => typeof x === "string");
    if (!ok) throw new Error(tMsg("seller.validation.tagsMustBeArray", req));
    return true;
  }),

  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tMsg("seller.validation.booleanField", req)
  ),

  // ⬇️ categories: zorunlu ve objectId[]
  body("categories")
    .exists().withMessage((_, { req }) => tMsg("seller.validation.categoriesRequired", req) || "categories_required")
    .bail()
    .customSanitizer(coerceToArrayOfStrings)
    .custom((val, ctx) => categoriesValidator(val, ctx, { required: true })),

  validateRequest,
];

/** Update (Admin) */
export const updateSellerValidator = [
  body("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    tMsg("seller.validation.kindInvalid", req)
  ),
  body("companyName").optional().isString(),
  body("contactName").optional().isString(),
  body("email").optional().isEmail().withMessage((_, { req }) =>
    tMsg("seller.validation.invalidEmail", req)
  ),
  body("phone").optional().isString(),

  body("userRef").optional().isMongoId().withMessage((_, { req }) =>
    tMsg("seller.validation.invalidObjectId", req)
  ),

  body("slug").optional().isString().trim(),

  body("billing").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    if (!val) return true;
    if (typeof val !== "object") throw new Error(tMsg("seller.validation.invalidBilling", req));
    if (val.defaultCurrency && !["USD", "EUR", "TRY"].includes(val.defaultCurrency))
      throw new Error(tMsg("seller.validation.invalidCurrency", req));
    if (val.paymentTermDays !== undefined && (typeof val.paymentTermDays !== "number" || val.paymentTermDays < 0 || val.paymentTermDays > 365))
      throw new Error(tMsg("seller.validation.invalidPaymentTerm", req));
    if (val.defaultDueDayOfMonth !== undefined && (val.defaultDueDayOfMonth < 1 || val.defaultDueDayOfMonth > 28))
      throw new Error(tMsg("seller.validation.invalidDueDay", req));
    return true;
  }),

  body("addresses").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(tMsg("seller.validation.addressesMustBeArray", req));
    return true;
  }),

  body("tags").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(tMsg("seller.validation.tagsMustBeArray", req));
    const ok = arr.every((x) => typeof x === "string");
    if (!ok) throw new Error(tMsg("seller.validation.tagsMustBeArray", req));
    return true;
  }),

  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tMsg("seller.validation.booleanField", req)
  ),

  // Görsel operasyon parametreleri (opsiyonel)
  body("removeImages").optional().customSanitizer(parseIfJson),
  body("primaryIndex").optional().isInt({ min: 0 }).toInt(),
  body("replaceAt").optional().isInt({ min: 0 }).toInt(),

  // ⬇️ categories: opsiyonel ama varsa geçerli ve boş olmayan id[]
  body("categories")
    .optional()
    .customSanitizer(coerceToArrayOfStrings)
    .custom((val, ctx) => categoriesValidator(val, ctx, { required: true })),

  validateRequest,
];

/** Public Update (kullanıcı kendi kaydını günceller) */
export const updateSellerPublicValidator = [
  body("companyName").optional().isString(),
  body("contactName").optional().isString(),
  body("email").optional().isEmail(),
  body("phone").optional().isString(),
  body("notes").optional().isString(),

  body("kind").optional().isIn(["person", "organization"]),
  body("tags").optional().customSanitizer(parseIfJson).custom((val) => {
    if (!Array.isArray(val)) throw new Error("tags_must_be_array");
    if (!val.every((x) => typeof x === "string")) throw new Error("tags_must_be_array_of_string");
    return true;
  }),

  body("location").optional().customSanitizer(parseIfJson).custom((val) => {
    if (val == null) return true;
    if (typeof val !== "object") throw new Error("location_invalid");
    if (val.country !== undefined && typeof val.country !== "string") throw new Error("location_invalid_country");
    if (val.city !== undefined && typeof val.city !== "string") throw new Error("location_invalid_city");
    return true;
  }),

  body("billing").optional().customSanitizer(parseIfJson).custom((val) => {
    if (!val) return true;
    if (typeof val !== "object") throw new Error("billing_invalid");
    if (val.defaultCurrency && !["USD","EUR","TRY"].includes(val.defaultCurrency)) throw new Error("currency_invalid");
    if (val.paymentTermDays !== undefined) {
      const n = Number(val.paymentTermDays);
      if (!Number.isFinite(n) || n < 0 || n > 365) throw new Error("payment_term_invalid");
    }
    if (val.defaultDueDayOfMonth !== undefined) {
      const n = Number(val.defaultDueDayOfMonth);
      if (!Number.isFinite(n) || n < 1 || n > 28) throw new Error("due_day_invalid");
    }
    return true;
  }),

  // categories: opsiyonel ama varsa boş olamaz ve ObjectId[]
  body("categories")
    .optional()
    .customSanitizer(coerceToArrayOfStrings)
    .custom((val, ctx) => categoriesValidator(val, ctx, { required: true })),

  // Bu endpointte desteklenmeyenleri açıkça yasakla
  body("addresses").not().exists(),
  body("slug").not().exists(),
  body("userRef").not().exists(),

  validateRequest,
];
