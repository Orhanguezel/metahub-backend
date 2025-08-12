import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

const TYPES = ["vendor_bill","purchase","reimbursement","subscription","utility","other"];
const STATUSES = ["draft","submitted","approved","scheduled","partially_paid","paid","rejected","void"];
const REIMB = ["not_required","pending","submitted","approved","paid"];

export const validateObjectId = (name: string) => [
  param(name).isMongoId().withMessage((_, { req }) => translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)),
  validateRequest,
];

// Line array
const validateLines = body("lines")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("validation.linesInvalid"));
    for (const ln of val) {
      if (ln.qty !== undefined && (typeof ln.qty !== "number" || ln.qty < 0)) throw new Error(t("validation.qtyInvalid"));
      if (ln.unitPrice !== undefined && (typeof ln.unitPrice !== "number" || ln.unitPrice < 0)) throw new Error(t("validation.priceInvalid"));
      if (ln.discount !== undefined && (typeof ln.discount !== "number" || ln.discount < 0)) throw new Error(t("validation.discountInvalid"));
      if (ln.taxRate !== undefined && (typeof ln.taxRate !== "number" || ln.taxRate < 0 || ln.taxRate > 100)) throw new Error(t("validation.taxRateInvalid"));
    }
    return true;
  });

const validateAttachments = body("attachments")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("validation.attachmentsInvalid"));
    for (const f of val) {
      if (!f || typeof f !== "object" || !f.url) throw new Error(t("validation.attachmentsInvalid"));
    }
    return true;
  });

const validateApprovals = body("approvals")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("validation.approvalsInvalid"));
    return true;
  });

const validateTags = body("tags")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("validation.tagsInvalid"));
    return true;
  });

const validatePaymentRefs = body("paymentRefs")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("validation.paymentRefsInvalid"));
    return true;
  });

export const validateCreateExpense = [
  body("type").isIn(TYPES).withMessage((_, { req }) => translate("validation.invalidType", req.locale || getLogLocale(), translations)),
  body("expenseDate").isISO8601().withMessage((_, { req }) => translate("validation.invalidDate", req.locale || getLogLocale(), translations)),
  body("currency").isString().notEmpty().withMessage((_, { req }) => translate("validation.invalidCurrency", req.locale || getLogLocale(), translations)),
  body("fxRate").optional().isFloat({ min: 0 }),
  body("status").optional().isIn(STATUSES).withMessage((_, { req }) => translate("validation.invalidStatus", req.locale || getLogLocale(), translations)),
  body("reimbursable").optional().toBoolean().isBoolean(),
  body("reimbursementStatus").optional().isIn(REIMB).withMessage((_, { req }) => translate("validation.invalidStatus", req.locale || getLogLocale(), translations)),

  validateLines,
  validateAttachments,
  validateApprovals,
  validatePaymentRefs,
  validateTags,

  validateRequest,
];

export const validateUpdateExpense = [
  body("type").optional().isIn(TYPES).withMessage((_, { req }) => translate("validation.invalidType", req.locale || getLogLocale(), translations)),
  body("expenseDate").optional().isISO8601(),
  body("dueDate").optional().isISO8601(),
  body("postedAt").optional().isISO8601(),
  body("currency").optional().isString(),
  body("baseCurrency").optional().isString(),
  body("fxRate").optional().isFloat({ min: 0 }),
  body("status").optional().isIn(STATUSES).withMessage((_, { req }) => translate("validation.invalidStatus", req.locale || getLogLocale(), translations)),
  body("reimbursable").optional().toBoolean().isBoolean(),
  body("reimbursementStatus").optional().isIn(REIMB),
  body("paidAmount").optional().isFloat({ min: 0 }),

  validateLines,
  validateAttachments,
  validateApprovals,
  validatePaymentRefs,
  validateTags,

  validateRequest,
];

export const validateAdminQuery = [
  query("q").optional().isString(),
  query("type").optional().isIn(TYPES),
  query("status").optional().isIn(STATUSES),
  query("vendorRef").optional().isMongoId(),
  query("employeeRef").optional().isMongoId(),
  query("apartmentRef").optional().isMongoId(),
  query("jobRef").optional().isMongoId(),
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
  query("reimbursable").optional().isBoolean().toBoolean(),
  query("reimbursementStatus").optional().isIn(REIMB),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
