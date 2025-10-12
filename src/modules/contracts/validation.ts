import { body, param, query, type CustomValidator } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/middleware/auth/validation";

function parseIfJson(v: any) {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
}

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* parties */
const validatePartiesRequired = body("parties")
  .customSanitizer(parseIfJson)
  .custom((p, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!p || typeof p !== "object") throw new Error(t("validation.partiesRequired"));
    if (!p.apartment || !isValidObjectId(String(p.apartment)))
      throw new Error(t("validation.apartmentRequired"));
    if (p.customer && !isValidObjectId(String(p.customer)))
      throw new Error(t("validation.customerInvalid"));
    if (p.contactSnapshot) {
      const cs = p.contactSnapshot;
      if (typeof cs !== "object") throw new Error(t("validation.contactInvalid"));
      if (cs.name && typeof cs.name !== "string") throw new Error(t("validation.contactName"));
      if (cs.email && typeof cs.email === "string") {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cs.email);
        if (!ok) throw new Error(t("validation.contactEmail"));
      }
    }
    return true;
  });

const validatePartiesOptional = body("parties")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((p, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!p || typeof p !== "object") throw new Error(t("validation.partiesInvalid"));
    if (p.apartment && !isValidObjectId(String(p.apartment)))
      throw new Error(t("validation.apartmentInvalid"));
    if (p.customer && !isValidObjectId(String(p.customer)))
      throw new Error(t("validation.customerInvalid"));
    if (p.contactSnapshot) {
      const cs = p.contactSnapshot;
      if (typeof cs !== "object") throw new Error(t("validation.contactInvalid"));
      if (cs.name && typeof cs.name !== "string") throw new Error(t("validation.contactName"));
      if (cs.email && typeof cs.email === "string") {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cs.email);
        if (!ok) throw new Error(t("validation.contactEmail"));
      }
    }
    return true;
  });

/* lines[] */
const validateLinesOptional = body("lines")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.linesInvalid"));
    for (const l of arr) {
      if (!l || typeof l !== "object") throw new Error(t("validation.lineItemInvalid"));
      if (!l.service || !isValidObjectId(String(l.service)))
        throw new Error(t("validation.lineService"));
      if (l.isIncludedInContractPrice !== undefined && typeof l.isIncludedInContractPrice !== "boolean")
        throw new Error(t("validation.booleanField"));
      if (l.unitPrice !== undefined && (typeof l.unitPrice !== "number" || l.unitPrice < 0))
        throw new Error(t("validation.lineUnitPrice"));
      if (l.currency && typeof l.currency !== "string")
        throw new Error(t("validation.lineCurrency"));

      if (l.schedule) {
        const s = l.schedule;
        if (typeof s !== "object") throw new Error(t("validation.scheduleInvalid"));
        if (typeof s.every !== "number" || s.every < 1)
          throw new Error(t("validation.scheduleEvery"));
        if (!["day", "week", "month"].includes(String(s.unit)))
          throw new Error(t("validation.scheduleUnit"));
        if (s.daysOfWeek) {
          if (!Array.isArray(s.daysOfWeek)) throw new Error(t("validation.scheduleDOW"));
          for (const d of s.daysOfWeek) if (typeof d !== "number" || d < 0 || d > 6)
            throw new Error(t("validation.scheduleDOW"));
        }
        if (s.exceptions) {
          if (!Array.isArray(s.exceptions)) throw new Error(t("validation.scheduleExceptions"));
          for (const d of s.exceptions) if (typeof d !== "number" || d < 0 || d > 6)
            throw new Error(t("validation.scheduleExceptions"));
        }
      }

      if (l.manpower) {
        const m = l.manpower;
        if (typeof m !== "object") throw new Error(t("validation.manpowerInvalid"));
        if (typeof m.headcount !== "number" || m.headcount < 1)
          throw new Error(t("validation.manpowerHeadcount"));
        if (typeof m.durationMinutes !== "number" || m.durationMinutes < 1)
          throw new Error(t("validation.manpowerDuration"));
      }

      if (l.isActive !== undefined && typeof l.isActive !== "boolean")
        throw new Error(t("validation.booleanField"));
    }
    return true;
  });

/* billing – ortak validator fonksiyonu */
const billingValidator: CustomValidator = (b, { req }) => {
  const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);

  if (!b || typeof b !== "object") throw new Error(t("validation.billingRequired"));
  if (!["fixed", "perLine"].includes(String(b.mode))) throw new Error(t("validation.billingMode"));

  if (b.mode === "fixed" && (typeof b.amount !== "number" || b.amount < 0))
    throw new Error(t("validation.billingAmount"));

  if (!b.currency || typeof b.currency !== "string")
    throw new Error(t("validation.billingCurrency"));

  if (!["weekly", "monthly", "quarterly", "yearly"].includes(String(b.period)))
    throw new Error(t("validation.billingPeriod"));

  const dr = b.dueRule;
  if (!dr || typeof dr !== "object") throw new Error(t("validation.dueRule"));

  if (!["dayOfMonth", "nthWeekday"].includes(String(dr.type)))
    throw new Error(t("validation.dueRuleType"));

  if (dr.type === "dayOfMonth") {
    if (typeof dr.day !== "number" || dr.day < 1 || dr.day > 31)
      throw new Error(t("validation.dueRuleDay"));
  } else {
    if (
      typeof dr.nth !== "number" || dr.nth < 1 || dr.nth > 5 ||
      typeof dr.weekday !== "number" || dr.weekday < 0 || dr.weekday > 6
    ) {
      throw new Error(t("validation.dueRuleNthWeekday"));
    }
  }

  if (!b.startDate || isNaN(Date.parse(b.startDate)))
    throw new Error(t("validation.billingStart"));
  if (b.endDate && isNaN(Date.parse(b.endDate)))
    throw new Error(t("validation.billingEnd"));

  if (b.graceDays !== undefined && (typeof b.graceDays !== "number" || b.graceDays < 0))
    throw new Error(t("validation.graceDays"));

  if (Array.isArray(b.revisions)) {
    for (const r of b.revisions) {
      if (isNaN(Date.parse(r?.validFrom))) throw new Error(t("validation.revisionDate"));
      if (r.amount !== undefined && (typeof r.amount !== "number" || r.amount < 0))
        throw new Error(t("validation.revisionAmount"));
      if (r.currency && typeof r.currency !== "string")
        throw new Error(t("validation.revisionCurrency"));
    }
  }
  return true;
};

const validateBillingRequired = body("billing")
  .customSanitizer(parseIfJson)
  .custom(billingValidator);

const validateBillingOptional = body("billing")
  .optional()
  .customSanitizer(parseIfJson)
  .custom(billingValidator);

/* i18n */
const validateI18nOptional = (field: "title" | "description") =>
  body(field).optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("validation.i18nInvalid"));
    return true;
  });

/* CREATE */
export const validateCreateContract = [
  validateI18nOptional("title"),
  validateI18nOptional("description"),
  validatePartiesRequired,
  validateLinesOptional,
  validateBillingRequired,

  body("status").optional().isIn(["draft", "active", "suspended", "terminated", "expired"]),
  body("activatedAt").optional().isISO8601(),
  body("terminatedAt").optional().isISO8601(),
  body("reasonNote").optional().isString(),
  body("isActive").optional().isBoolean().toBoolean(),
  body("code").optional().isString(),

  validateRequest,
];

/* UPDATE */
export const validateUpdateContract = [
  validateI18nOptional("title"),
  validateI18nOptional("description"),
  validatePartiesOptional,
  validateLinesOptional,
  validateBillingOptional,

  body("status").optional().isIn(["draft", "active", "suspended", "terminated", "expired"]),
  body("activatedAt").optional().isISO8601(),
  body("terminatedAt").optional().isISO8601(),
  body("reasonNote").optional().isString(),
  body("isActive").optional().isBoolean().toBoolean(),
  body("code").optional().isString(),

  validateRequest,
];

/* STATUS PATCH */
export const validateChangeContractStatus = [
  body("status").isIn(["draft", "active", "suspended", "terminated", "expired"]),
  validateRequest,
];

/* LIST QUERY */
export const validateContractListQuery = [
  query("status").optional().isIn(["draft", "active", "suspended", "terminated", "expired"]),
  query("apartment").optional().isMongoId(),
  query("customer").optional().isMongoId(),
  query("period").optional().isIn(["weekly", "monthly", "quarterly", "yearly"]),
  query("startFrom").optional().isISO8601(),
  query("startTo").optional().isISO8601(),
  query("q").optional().isString(),
  query("isActive").optional().isBoolean().toBoolean(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
