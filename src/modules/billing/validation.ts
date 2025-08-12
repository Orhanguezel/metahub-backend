import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/utils/validation";

/* ---------------- helpers ---------------- */
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
// Source
const validateSourceRequired = body("source")
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("plan.validation.source"));
    if (!val.contract || !isValidObjectId(String(val.contract)))
      throw new Error(t("plan.validation.contract"));
    if (!val.mode || !["fixed", "perLine"].includes(String(val.mode)))
      throw new Error(t("plan.validation.mode"));
    if (val.contractLine && !isValidObjectId(String(val.contractLine)))
      throw new Error(t("plan.validation.contractLine"));
    return true;
  });

const validateSourceOptional = body("source")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("plan.validation.source"));
    if (val.contract && !isValidObjectId(String(val.contract)))
      throw new Error(t("plan.validation.contract"));
    if (val.mode && !["fixed", "perLine"].includes(String(val.mode)))
      throw new Error(t("plan.validation.mode"));
    if (val.contractLine && !isValidObjectId(String(val.contractLine)))
      throw new Error(t("plan.validation.contractLine"));
    return true;
  });

// Schedule
const validateScheduleRequired = body("schedule")
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("plan.validation.schedule"));
    if (typeof val.amount !== "number" || val.amount < 0)
      throw new Error(t("plan.validation.amount"));
    if (!val.currency || typeof val.currency !== "string")
      throw new Error(t("plan.validation.currency"));
    if (!["weekly", "monthly", "quarterly", "yearly"].includes(String(val.period)))
      throw new Error(t("plan.validation.period"));
    const due = val.dueRule;
    if (!due || typeof due !== "object") throw new Error(t("plan.validation.dueRule"));
    if (due.type === "dayOfMonth") {
      if (typeof due.day !== "number" || due.day < 1 || due.day > 31)
        throw new Error(t("plan.validation.day"));
    } else if (due.type === "nthWeekday") {
      if (![1,2,3,4,5].includes(Number(due.nth))) throw new Error(t("plan.validation.nth"));
      if (typeof due.weekday !== "number" || due.weekday < 0 || due.weekday > 6)
        throw new Error(t("plan.validation.weekday"));
    } else throw new Error(t("plan.validation.dueType"));
    if (!val.startDate || isNaN(Date.parse(val.startDate)))
      throw new Error(t("plan.validation.startDate"));
    if (val.endDate && isNaN(Date.parse(val.endDate)))
      throw new Error(t("plan.validation.endDate"));
    if (val.graceDays !== undefined && (typeof val.graceDays !== "number" || val.graceDays < 0))
      throw new Error(t("plan.validation.graceDays"));
    return true;
  });

const validateScheduleOptional = body("schedule")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("plan.validation.schedule"));
    // same checks as above but optional presence
    if (val.amount !== undefined && (typeof val.amount !== "number" || val.amount < 0))
      throw new Error(t("plan.validation.amount"));
    if (val.currency !== undefined && typeof val.currency !== "string")
      throw new Error(t("plan.validation.currency"));
    if (val.period && !["weekly", "monthly", "quarterly", "yearly"].includes(String(val.period)))
      throw new Error(t("plan.validation.period"));
    if (val.dueRule) {
      const due = val.dueRule;
      if (due.type === "dayOfMonth") {
        if (typeof due.day !== "number" || due.day < 1 || due.day > 31)
          throw new Error(t("plan.validation.day"));
      } else if (due.type === "nthWeekday") {
        if (![1,2,3,4,5].includes(Number(due.nth))) throw new Error(t("plan.validation.nth"));
        if (typeof due.weekday !== "number" || due.weekday < 0 || due.weekday > 6)
          throw new Error(t("plan.validation.weekday"));
      } else throw new Error(t("plan.validation.dueType"));
    }
    if (val.startDate && isNaN(Date.parse(val.startDate)))
      throw new Error(t("plan.validation.startDate"));
    if (val.endDate && isNaN(Date.parse(val.endDate)))
      throw new Error(t("plan.validation.endDate"));
    if (val.graceDays !== undefined && (typeof val.graceDays !== "number" || val.graceDays < 0))
      throw new Error(t("plan.validation.graceDays"));
    return true;
  });

/* ---------------- Plans ---------------- */
export const validateCreatePlan = [
  validateSourceRequired,
  validateScheduleRequired,
  body("code").optional().isString(),
  body("status").optional().isIn(["draft","active","paused","ended"]),
  body("notes").optional().customSanitizer(parseIfJson).custom(() => true),
  body("revisions").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("plan.validation.revisions"));
    for (const r of val) {
      if (!r || typeof r !== "object") throw new Error(t("plan.validation.revisionItem"));
      if (!r.validFrom || isNaN(Date.parse(r.validFrom))) throw new Error(t("plan.validation.validFrom"));
      if (r.amount !== undefined && (typeof r.amount !== "number" || r.amount < 0))
        throw new Error(t("plan.validation.amount"));
    }
    return true;
  }),
  validateRequest,
];

export const validateUpdatePlan = [
  validateSourceOptional,
  validateScheduleOptional,
  body("code").optional().isString(),
  body("status").optional().isIn(["draft","active","paused","ended"]),
  body("notes").optional().customSanitizer(parseIfJson).custom(() => true),
  body("revisions").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("plan.validation.revisions"));
    return true;
  }),
  body("lastRunAt").optional().isISO8601(),
  body("nextDueAt").optional().isISO8601(),
  validateRequest,
];

export const validateChangePlanStatus = [
  body("status").isIn(["draft","active","paused","ended"]).withMessage((_, { req }) =>
    translate("plan.validation.status", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

export const validatePlanListQuery = [
  query("status").optional().isIn(["draft","active","paused","ended"]),
  query("contract").optional().isMongoId(),
  query("apartment").optional().isMongoId(),
  query("customer").optional().isMongoId(),
  query("q").optional().isString(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("nextDueFrom").optional().isISO8601(),
  query("nextDueTo").optional().isISO8601(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

/* ------------- Occurrences -------------- */
export const validateCreateOccurrence = [
  body("plan").notEmpty().isMongoId().withMessage((_, { req }) =>
    translate("occ.validation.plan", req.locale || getLogLocale(), translations)
  ),
  body("windowStart").notEmpty().isISO8601(),
  body("windowEnd").notEmpty().isISO8601(),
  body("dueAt").notEmpty().isISO8601(),
  body("amount").optional().isFloat({ min: 0 }),
  body("currency").optional().isString(),
  body("status").optional().isIn(["pending","invoiced","skipped","canceled"]),
  body("invoice").optional().isMongoId(),
  body("seq").optional().isInt({ min: 1 }),
  body("notes").optional().customSanitizer(parseIfJson).custom(() => true),
  validateRequest,
];

export const validateUpdateOccurrence = [
  body("plan").optional().isMongoId(), // normalde değişmez ama koruduk
  body("windowStart").optional().isISO8601(),
  body("windowEnd").optional().isISO8601(),
  body("dueAt").optional().isISO8601(),
  body("amount").optional().isFloat({ min: 0 }),
  body("currency").optional().isString(),
  body("status").optional().isIn(["pending","invoiced","skipped","canceled"]),
  body("invoice").optional().isMongoId(),
  body("seq").optional().isInt({ min: 1 }),
  body("notes").optional().customSanitizer(parseIfJson).custom(() => true),
  validateRequest,
];

export const validateOccurrenceListQuery = [
  query("status").optional().isIn(["pending","invoiced","skipped","canceled"]),
  query("plan").optional().isMongoId(),
  query("invoice").optional().isMongoId(),
  query("dueFrom").optional().isISO8601(),
  query("dueTo").optional().isISO8601(),
  query("seqFrom").optional().isInt({ min: 1 }),
  query("seqTo").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
