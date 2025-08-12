import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

/* helpers */
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const isObjectId = (s?: any) => typeof s === "string" && /^[a-f\d]{24}$/i.test(s);

/* param id */
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* anchor */
const validateAnchorRequired = body("anchor")
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("validation.anchorRequired"));
    if (!isObjectId(val.apartmentRef)) throw new Error(t("validation.apartmentRef"));
    if (val.categoryRef && !isObjectId(val.categoryRef)) throw new Error(t("validation.categoryRef"));
    if (val.serviceRef && !isObjectId(val.serviceRef)) throw new Error(t("validation.serviceRef"));
    if (val.templateRef && !isObjectId(val.templateRef)) throw new Error(t("validation.templateRef"));
    if (val.contractRef && !isObjectId(val.contractRef)) throw new Error(t("validation.contractRef"));
    return true;
  });

const validateAnchorOptional = body("anchor").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
  const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
  if (!val || typeof val !== "object") throw new Error(t("validation.anchorInvalid"));
  if (val.apartmentRef && !isObjectId(val.apartmentRef)) throw new Error(t("validation.apartmentRef"));
  if (val.categoryRef && !isObjectId(val.categoryRef)) throw new Error(t("validation.categoryRef"));
  if (val.serviceRef && !isObjectId(val.serviceRef)) throw new Error(t("validation.serviceRef"));
  if (val.templateRef && !isObjectId(val.templateRef)) throw new Error(t("validation.templateRef"));
  if (val.contractRef && !isObjectId(val.contractRef)) throw new Error(t("validation.contractRef"));
  return true;
});

/* pattern union */
const validatePatternRequired = body("pattern")
  .customSanitizer(parseIfJson)
  .custom((p, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!p || typeof p !== "object" || !p.type) throw new Error(t("validation.patternRequired"));
    if (!["weekly","dayOfMonth","nthWeekday","yearly"].includes(p.type)) throw new Error(t("validation.patternType"));
    if (p.type === "weekly") {
      if (!p.every || p.every < 1) throw new Error(t("validation.patternEvery"));
      if (!Array.isArray(p.daysOfWeek) || p.daysOfWeek.some((d: any)=> d<0 || d>6)) throw new Error(t("validation.daysOfWeek"));
    }
    if (p.type === "dayOfMonth") {
      if (!p.every || p.every < 1) throw new Error(t("validation.patternEvery"));
      if (!p.day || p.day < 1 || p.day > 31) throw new Error(t("validation.dayOfMonth"));
    }
    if (p.type === "nthWeekday") {
      if (!p.every || p.every < 1) throw new Error(t("validation.patternEvery"));
      if (![1,2,3,4,5].includes(p.nth)) throw new Error(t("validation.nth"));
      if (p.weekday < 0 || p.weekday > 6) throw new Error(t("validation.weekday"));
    }
    if (p.type === "yearly") {
      if (!p.month || p.month < 1 || p.month > 12) throw new Error(t("validation.month"));
      if (!p.day || p.day < 1 || p.day > 31) throw new Error(t("validation.dayOfMonth"));
    }
    return true;
  });

const validatePatternOptional = body("pattern").optional().customSanitizer(parseIfJson).custom((p, { req }) => {
  const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
  if (!p || typeof p !== "object" || !p.type) throw new Error(t("validation.patternInvalid"));
  return true; // ayrıntı kontrolü yukarıdaki ile aynı kalıpta yapılabilir
});

/* window/policy optional */
const validateWindowOptional = body("window").optional().customSanitizer(parseIfJson).custom((w, { req }) => {
  const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
  if (!w || typeof w !== "object") throw new Error(t("validation.windowInvalid"));
  if (w.durationMinutes !== undefined && (typeof w.durationMinutes !== "number" || w.durationMinutes < 0))
    throw new Error(t("validation.duration"));
  return true;
});

const validatePolicyOptional = body("policy").optional().customSanitizer(parseIfJson).custom((p, { req }) => {
  const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
  if (!p || typeof p !== "object") throw new Error(t("validation.policyInvalid"));
  if (p.leadTimeDays !== undefined && (typeof p.leadTimeDays !== "number" || p.leadTimeDays < 0))
    throw new Error(t("validation.leadTimeDays"));
  if (p.lockAheadPeriods !== undefined && (typeof p.lockAheadPeriods !== "number" || p.lockAheadPeriods < 0))
    throw new Error(t("validation.lockAhead"));
  return true;
});

/* date fields */
const validateDatesCreate = [
  body("startDate").isISO8601().withMessage((_, { req }) =>
    translate("validation.startDate", req.locale || getLogLocale(), translations)
  ),
  body("endDate").optional().isISO8601().withMessage((_, { req }) =>
    translate("validation.endDate", req.locale || getLogLocale(), translations)
  ),
];

const validateDatesUpdate = [
  body("startDate").optional().isISO8601().withMessage((_, { req }) =>
    translate("validation.startDate", req.locale || getLogLocale(), translations)
  ),
  body("endDate").optional().isISO8601().withMessage((_, { req }) =>
    translate("validation.endDate", req.locale || getLogLocale(), translations)
  ),
];

/* arrays */
const validateArraysOptional = [
  body("skipDates").optional().customSanitizer(parseIfJson).custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.skipDates"));
    return true;
  }),
  body("blackouts").optional().customSanitizer(parseIfJson).custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.blackouts"));
    return true;
  }),
  body("tags").optional().customSanitizer(parseIfJson).custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.tags"));
    return true;
  }),
];

/* CREATE */
export const validateCreateSchedulePlan = [
  body("code").optional().isString().trim(),
  body("title").optional().custom(()=>true),
  body("description").optional().custom(()=>true),

  validateAnchorRequired,
  body("timezone").optional().isString(),

  validatePatternRequired,
  validateWindowOptional,
  validatePolicyOptional,

  ...validateDatesCreate,
  ...validateArraysOptional,

  body("lastJobRef").optional().isMongoId(),
  body("status").optional().isIn(["active","paused","archived"]),
  validateRequest,
];

/* UPDATE */
export const validateUpdateSchedulePlan = [
  body("code").optional().isString().trim(),
  body("title").optional().custom(()=>true),
  body("description").optional().custom(()=>true),

  validateAnchorOptional,
  body("timezone").optional().isString(),

  validatePatternOptional,
  validateWindowOptional,
  validatePolicyOptional,

  ...validateDatesUpdate,
  ...validateArraysOptional,

  body("lastJobRef").optional().isMongoId(),
  body("status").optional().isIn(["active","paused","archived"]),
  validateRequest,
];

/* LIST query */
export const validateAdminQuery = [
  query("q").optional().isString(),
  query("status").optional().isIn(["active","paused","archived"]),
  query("apartmentRef").optional().isMongoId(),
  query("serviceRef").optional().isMongoId(),
  query("templateRef").optional().isMongoId(),
  query("contractRef").optional().isMongoId(),
  query("tag").optional().isString(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
