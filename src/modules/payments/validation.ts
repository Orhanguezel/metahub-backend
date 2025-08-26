import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/utils/validation";

/* ------------ helpers ------------ */
function parseIfJson(v: any) {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
}

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* ------- sub-validators ------- */
const validatePayerOptional = body("payer")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((p, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!p || typeof p !== "object") throw new Error(t("validation.payerInvalid"));
    if (p.email && typeof p.email === "string") {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email);
      if (!ok) throw new Error(t("validation.emailInvalid"));
    }
    return true;
  });

const validateInstrumentOptional = body("instrument")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((ins, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!ins || typeof ins !== "object") throw new Error(t("validation.instrumentInvalid"));
    if (ins.type && !["card", "bank", "cash", "wallet", "other"].includes(String(ins.type)))
      throw new Error(t("validation.instrumentType"));
    return true;
  });

const validateLinksOptional = body("links")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((l, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!l || typeof l !== "object") throw new Error(t("validation.linksInvalid"));
    const checkId = (v: any) => !v || isValidObjectId(String(v));
    if (!checkId(l.customer)) throw new Error(t("validation.linksCustomer"));
    if (!checkId(l.apartment)) throw new Error(t("validation.linksApartment"));
    if (!checkId(l.contract)) throw new Error(t("validation.linksContract"));
    if (!checkId(l.order))    throw new Error(t("validation.linksOrder"));      // ✅ YENİ
    return true;
  });

const validateFeesOptional = body("fees")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.feesInvalid"));
    for (const f of arr) {
      if (!f || typeof f !== "object") throw new Error(t("validation.feeItem"));
      if (!["gateway", "bank", "manual"].includes(String(f.type))) throw new Error(t("validation.feeType"));
      if (typeof f.amount !== "number" || f.amount < 0) throw new Error(t("validation.feeAmount"));
      if (!f.currency || typeof f.currency !== "string") throw new Error(t("validation.feeCurrency"));
    }
    return true;
  });

const validateAllocationsOptional = body("allocations")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.allocationsInvalid"));
    for (const a of arr) {
      if (!a || typeof a !== "object") throw new Error(t("validation.allocationItem"));
      if (!a.invoice || !isValidObjectId(String(a.invoice)))
        throw new Error(t("validation.allocationInvoice"));
      if (typeof a.amount !== "number" || a.amount < 0)
        throw new Error(t("validation.allocationAmount"));
      if (a.appliedAt && isNaN(Date.parse(a.appliedAt)))
        throw new Error(t("validation.allocationDate"));
    }
    return true;
  });

/* ------------- CREATE ------------- */
export const validateCreatePayment = [
  body("kind").optional().isIn(["payment", "refund", "chargeback"]),
  body("status")
    .optional()
    .isIn(["pending", "confirmed", "partially_allocated", "allocated", "failed", "canceled"]),
  body("method")
    .notEmpty()
    .isIn(["cash", "bank_transfer", "sepa", "ach", "card", "wallet", "check", "other"]),
  body("provider").optional().isString(),
  body("providerRef").optional().isString(),
  body("reference").optional().isString(),

  body("grossAmount").notEmpty().isFloat({ min: 0 }),
  body("currency").notEmpty().isString(),
  body("fxRate").optional().isFloat({ min: 0 }),

  validateFeesOptional,

  body("receivedAt").notEmpty().isISO8601(),
  body("bookedAt").optional().isISO8601(),

  validatePayerOptional,
  validateInstrumentOptional,
  validateLinksOptional,
  validateAllocationsOptional,

  body("metadata").optional().customSanitizer(parseIfJson).custom(() => true),

  validateRequest,
];

/* ------------- UPDATE ------------- */
export const validateUpdatePayment = [
  body("kind").optional().isIn(["payment", "refund", "chargeback"]),
  body("status")
    .optional()
    .isIn(["pending", "confirmed", "partially_allocated", "allocated", "failed", "canceled"]),
  body("method").optional().isIn(["cash", "bank_transfer", "sepa", "ach", "card", "wallet", "check", "other"]),
  body("provider").optional().isString(),
  body("providerRef").optional().isString(),
  body("reference").optional().isString(),

  body("grossAmount").optional().isFloat({ min: 0 }),
  body("currency").optional().isString(),
  body("fxRate").optional().isFloat({ min: 0 }),

  validateFeesOptional,

  body("receivedAt").optional().isISO8601(),
  body("bookedAt").optional().isISO8601(),

  validatePayerOptional,
  validateInstrumentOptional,
  validateLinksOptional,
  validateAllocationsOptional,

  body("metadata").optional().customSanitizer(parseIfJson).custom(() => true),

  validateRequest,
];

/* ------ STATUS PATCH ------ */
export const validateChangePaymentStatus = [
  body("status")
    .isIn(["pending", "confirmed", "partially_allocated", "allocated", "failed", "canceled"])
    .withMessage((_, { req }) =>
      translate("validation.status", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

/* -------- LIST QUERY -------- */
export const validatePaymentListQuery = [
  query("status")
    .optional()
    .isIn(["pending", "confirmed", "partially_allocated", "allocated", "failed", "canceled"]),
  query("kind").optional().isIn(["payment", "refund", "chargeback"]),
  query("method").optional().isIn(["cash", "bank_transfer", "sepa", "ach", "card", "wallet", "check", "other"]),
  query("provider").optional().isString(),
  query("customer").optional().isMongoId(),
  query("apartment").optional().isMongoId(),
  query("order").optional().isMongoId(),
  query("contract").optional().isMongoId(),
  query("invoice").optional().isMongoId(),
  query("reconciled").optional().isBoolean().toBoolean(),
  query("q").optional().isString(),
  query("receivedFrom").optional().isISO8601(),
  query("receivedTo").optional().isISO8601(),
  query("amountMin").optional().isFloat({ min: 0 }),
  query("amountMax").optional().isFloat({ min: 0 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
