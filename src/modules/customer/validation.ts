import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tMsg = (key: string, req: any) =>
  translate(key, req.locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

export const validateCustomerIdParam = [
  param("id").isMongoId().withMessage((_, { req }) => tMsg("customer.validation.invalidObjectId", req)),
  validateRequest,
];

/* -------- Admin Query (list) -------- */
export const customersAdminQueryValidator = [
  query("q").optional().isString().trim(),
  query("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    tMsg("customer.validation.kindInvalid", req)
  ),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tMsg("customer.validation.booleanField", req)
  ),
  validateRequest,
];

/* -------- Create -------- */
export const createCustomerValidator = [
  body("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    tMsg("customer.validation.kindInvalid", req)
  ),
  body("companyName").optional().isString().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidString", req)
  ),
  body("contactName").optional().isString(),     // userRef varsa doldurulabilir
  body("email").optional().isEmail(),
  body("phone").optional().isString(),

  // NEW
  body("userRef").optional().isMongoId().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidObjectId", req)
  ),

  body("slug").optional().isString().trim(),

  body("billing").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    if (!val) return true;
    if (typeof val !== "object") throw new Error(tMsg("customer.validation.invalidBilling", req));
    if (val.defaultCurrency && !["USD","EUR","TRY"].includes(val.defaultCurrency))
      throw new Error(tMsg("customer.validation.invalidCurrency", req));
    if (val.paymentTermDays !== undefined && (typeof val.paymentTermDays !== "number" || val.paymentTermDays < 0 || val.paymentTermDays > 365))
      throw new Error(tMsg("customer.validation.invalidPaymentTerm", req));
    if (val.defaultDueDayOfMonth !== undefined && (val.defaultDueDayOfMonth < 1 || val.defaultDueDayOfMonth > 28))
      throw new Error(tMsg("customer.validation.invalidDueDay", req));
    return true;
  }),

  body("addresses").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(tMsg("customer.validation.addressesMustBeArray", req));
    return true;
  }),

  body("tags").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(tMsg("customer.validation.tagsMustBeArray", req));
    const ok = arr.every((x) => typeof x === "string");
    if (!ok) throw new Error(tMsg("customer.validation.tagsMustBeArray", req));
    return true;
  }),

  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tMsg("customer.validation.booleanField", req)
  ),

  validateRequest,
];

/* -------- Update (Admin) -------- */
export const updateCustomerValidator = [
  body("kind").optional().isIn(["person", "organization"]).withMessage((_, { req }) =>
    tMsg("customer.validation.kindInvalid", req)
  ),
  body("companyName").optional().isString().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidString", req)
  ),
  body("contactName").optional().isString().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidString", req)
  ),
  body("email").optional().isEmail().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidEmail", req)
  ),
  body("phone").optional().isString().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidString", req)
  ),

  // NEW
  body("userRef").optional().isMongoId().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidObjectId", req)
  ),

  body("slug").optional().isString().trim(),

  body("billing").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    if (!val) return true;
    if (typeof val !== "object") throw new Error(tMsg("customer.validation.invalidBilling", req));
    if (val.defaultCurrency && !["USD","EUR","TRY"].includes(val.defaultCurrency))
      throw new Error(tMsg("customer.validation.invalidCurrency", req));
    if (val.paymentTermDays !== undefined && (typeof val.paymentTermDays !== "number" || val.paymentTermDays < 0 || val.paymentTermDays > 365))
      throw new Error(tMsg("customer.validation.invalidPaymentTerm", req));
    if (val.defaultDueDayOfMonth !== undefined && (val.defaultDueDayOfMonth < 1 || val.defaultDueDayOfMonth > 28))
      throw new Error(tMsg("customer.validation.invalidDueDay", req));
    return true;
  }),

  body("addresses").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(tMsg("customer.validation.addressesMustBeArray", req));
    return true;
  }),

  body("tags").optional().custom((val, { req }) => {
    const arr = parseIfJson(val);
    if (!Array.isArray(arr)) throw new Error(tMsg("customer.validation.tagsMustBeArray", req));
    const ok = arr.every((x) => typeof x === "string");
    if (!ok) throw new Error(tMsg("customer.validation.tagsMustBeArray", req));
    return true;
  }),

  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tMsg("customer.validation.booleanField", req)
  ),

  validateRequest,
];

/* -------- Public Update -------- */
export const updateCustomerPublicValidator = [
  body("companyName").optional().isString().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidString", req)
  ),
  body("contactName").optional().isString().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidString", req)
  ),
  body("email").optional().isEmail().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidEmail", req)
  ),
  body("phone").optional().isString().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidString", req)
  ),
  body("notes").optional().isString().withMessage((_, { req }) =>
    tMsg("customer.validation.invalidString", req)
  ),

  // adres & yönetim alanları yasak
  body("addresses").not().exists().withMessage("Adres güncelleme bu endpointte desteklenmiyor!"),
  body("billing").not().exists(),
  body("tags").not().exists(),
  body("slug").not().exists(),
  body("kind").not().exists(),
  body("userRef").not().exists(), // NEW: public'te userRef değiştirilemez

  validateRequest,
];
