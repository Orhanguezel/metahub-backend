import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { isValidObjectId } from "@/core/utils/validation";

/* -------------- helpers -------------- */
function parseIfJson(v: any) {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
}

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* -------------- sub-validators -------------- */
const validatePartyRequired = (field: "seller" | "buyer") =>
  body(field)
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
      if (!val || typeof val !== "object") throw new Error(t(`validation.${field}Required`));
      if (!val.name || typeof val.name !== "string") throw new Error(t(`validation.${field}Name`));
      if (val.email && typeof val.email === "string") {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.email);
        if (!ok) throw new Error(t("validation.emailInvalid"));
      }
      return true;
    });

const validatePartyOptional = (field: "seller" | "buyer") =>
  body(field)
    .optional()
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
      if (!val || typeof val !== "object") throw new Error(t(`validation.${field}Invalid`));
      if (val.name && typeof val.name !== "string") throw new Error(t(`validation.${field}Name`));
      if (val.email && typeof val.email === "string") {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.email);
        if (!ok) throw new Error(t("validation.emailInvalid"));
      }
      return true;
    });

const validateDiscountOptional = (path: string) =>
  body(path)
    .optional()
    .customSanitizer(parseIfJson)
    .custom((d, { req }) => {
      const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
      if (!d || typeof d !== "object") throw new Error(t("validation.discountInvalid"));
      if (!["rate", "amount"].includes(String(d.type))) throw new Error(t("validation.discountType"));
      if (typeof d.value !== "number" || d.value < 0) throw new Error(t("validation.discountValue"));
      if (d.type === "rate" && d.value > 100) throw new Error(t("validation.discountRateRange"));
      return true;
    });

const validateItemsRequired = body("items")
  .customSanitizer(parseIfJson)
  .custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr) || arr.length === 0) throw new Error(t("validation.itemsRequired"));
    for (const it of arr) {
      if (!it || typeof it !== "object") throw new Error(t("validation.itemInvalid"));
      if (!["service", "fee", "product", "custom"].includes(String(it.kind)))
        throw new Error(t("validation.itemKind"));
      if (!it.name || typeof it.name !== "object") throw new Error(t("validation.itemName"));
      if (typeof it.quantity !== "number" || it.quantity < 0) throw new Error(t("validation.itemQty"));
      if (typeof it.unitPrice !== "number" || it.unitPrice < 0) throw new Error(t("validation.itemUnitPrice"));
      if (it.taxRate !== undefined && (typeof it.taxRate !== "number" || it.taxRate < 0 || it.taxRate > 100))
        throw new Error(t("validation.itemTaxRate"));
      // row discount
      if (it.discount !== undefined) {
        const d = it.discount;
        if (!d || typeof d !== "object") throw new Error(t("validation.discountInvalid"));
        if (!["rate", "amount"].includes(String(d.type))) throw new Error(t("validation.discountType"));
        if (typeof d.value !== "number" || d.value < 0) throw new Error(t("validation.discountValue"));
        if (d.type === "rate" && d.value > 100) throw new Error(t("validation.discountRateRange"));
      }
    }
    return true;
  });

const validateItemsOptional = body("items")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.itemsInvalid"));
    for (const it of arr) {
      if (!it || typeof it !== "object") throw new Error(t("validation.itemInvalid"));
      if (it.kind && !["service", "fee", "product", "custom"].includes(String(it.kind)))
        throw new Error(t("validation.itemKind"));
      if (it.name && typeof it.name !== "object") throw new Error(t("validation.itemName"));
      if (it.quantity !== undefined && (typeof it.quantity !== "number" || it.quantity < 0))
        throw new Error(t("validation.itemQty"));
      if (it.unitPrice !== undefined && (typeof it.unitPrice !== "number" || it.unitPrice < 0))
        throw new Error(t("validation.itemUnitPrice"));
      if (it.taxRate !== undefined && (typeof it.taxRate !== "number" || it.taxRate < 0 || it.taxRate > 100))
        throw new Error(t("validation.itemTaxRate"));
      if (it.discount !== undefined) {
        const d = it.discount;
        if (!d || typeof d !== "object") throw new Error(t("validation.discountInvalid"));
        if (!["rate", "amount"].includes(String(d.type))) throw new Error(t("validation.discountType"));
        if (typeof d.value !== "number" || d.value < 0) throw new Error(t("validation.discountValue"));
        if (d.type === "rate" && d.value > 100) throw new Error(t("validation.discountRateRange"));
      }
    }
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
    if (!checkId(l.billingPlan)) throw new Error(t("validation.linksBillingPlan"));
    if (l.billingOccurrences) {
      if (!Array.isArray(l.billingOccurrences)) throw new Error(t("validation.linksOccurrences"));
      for (const id of l.billingOccurrences) {
        if (!isValidObjectId(String(id))) throw new Error(t("validation.linksOccurrences"));
      }
    }
    return true;
  });

const validateTotalsRequired = body("totals")
  .customSanitizer(parseIfJson)
  .custom((tot, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!tot || typeof tot !== "object") throw new Error(t("validation.totalsRequired"));
    if (!tot.currency || typeof tot.currency !== "string") throw new Error(t("validation.currency"));
    // amountPaid/balance/grandTotal gibi alanlar model pre-save ile normalize ediliyor
    return true;
  });

const validateTotalsOptional = body("totals")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((tot, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!tot || typeof tot !== "object") throw new Error(t("validation.totalsInvalid"));
    if (tot.currency && typeof tot.currency !== "string") throw new Error(t("validation.currency"));
    return true;
  });

/* -------------- CREATE -------------- */
export const validateCreateInvoice = [
  body("type").optional().isIn(["invoice", "creditNote"]),
  body("status").optional().isIn(["draft", "issued", "sent", "partially_paid", "paid", "canceled"]),
  body("issueDate").notEmpty().isISO8601(),
  body("dueDate").optional().isISO8601(),
  body("periodStart").optional().isISO8601(),
  body("periodEnd").optional().isISO8601(),

  validatePartyRequired("seller"),
  validatePartyRequired("buyer"),
  body("code").optional().isString(),

  body("notes").optional().customSanitizer(parseIfJson).custom(() => true),
  body("terms").optional().customSanitizer(parseIfJson).custom(() => true),
  body("attachments")
    .optional()
    .customSanitizer(parseIfJson)
    .custom((arr, { req }) => {
      const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
      if (!Array.isArray(arr)) throw new Error(t("validation.attachmentsInvalid"));
      for (const a of arr) {
        if (!a || typeof a !== "object" || typeof a.url !== "string")
          throw new Error(t("validation.attachmentItem"));
      }
      return true;
    }),

  validateLinksOptional,
  validateItemsRequired,
  validateDiscountOptional("invoiceDiscount"),
  validateTotalsRequired,

  validateRequest,
];

/* -------------- UPDATE -------------- */
export const validateUpdateInvoice = [
  body("type").optional().isIn(["invoice", "creditNote"]),
  body("status").optional().isIn(["draft", "issued", "sent", "partially_paid", "paid", "canceled"]),
  body("issueDate").optional().isISO8601(),
  body("dueDate").optional().isISO8601(),
  body("periodStart").optional().isISO8601(),
  body("periodEnd").optional().isISO8601(),

  validatePartyOptional("seller"),
  validatePartyOptional("buyer"),
  body("code").optional().isString(),

  body("notes").optional().customSanitizer(parseIfJson).custom(() => true),
  body("terms").optional().customSanitizer(parseIfJson).custom(() => true),
  body("attachments")
    .optional()
    .customSanitizer(parseIfJson)
    .custom((arr, { req }) => {
      const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
      if (!Array.isArray(arr)) throw new Error(t("validation.attachmentsInvalid"));
      for (const a of arr) {
        if (!a || typeof a !== "object" || (a.url && typeof a.url !== "string"))
          throw new Error(t("validation.attachmentItem"));
      }
      return true;
    }),

  validateLinksOptional,
  validateItemsOptional,
  validateDiscountOptional("invoiceDiscount"),
  validateTotalsOptional,

  validateRequest,
];

/* -------- status change (PATCH /:id/status) -------- */
export const validateChangeInvoiceStatus = [
  body("status").isIn(["draft", "issued", "sent", "partially_paid", "paid", "canceled"]).withMessage((_, { req }) =>
    translate("validation.status", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* -------------- LIST QUERY -------------- */
export const validateInvoiceListQuery = [
  query("status").optional().isIn(["draft", "issued", "sent", "partially_paid", "paid", "canceled"]),
  query("type").optional().isIn(["invoice", "creditNote"]),
  query("customer").optional().isMongoId(),
  query("apartment").optional().isMongoId(),
  query("contract").optional().isMongoId(),
  query("billingPlan").optional().isMongoId(),
  query("q").optional().isString(),
  query("issueFrom").optional().isISO8601(),
  query("issueTo").optional().isISO8601(),
  query("dueFrom").optional().isISO8601(),
  query("dueTo").optional().isISO8601(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
