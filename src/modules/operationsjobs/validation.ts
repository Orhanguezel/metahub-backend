import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const parseIfJson = (v: any) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
};

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

// --- Field validators ---

const validateScheduleOptional = body("schedule")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (typeof val !== "object") throw new Error(t("validation.scheduleInvalid"));
    const { plannedStart, plannedEnd } = val || {};
    if (plannedStart && isNaN(Date.parse(plannedStart))) throw new Error(t("validation.invalidDate"));
    if (plannedEnd && isNaN(Date.parse(plannedEnd))) throw new Error(t("validation.invalidDate"));
    return true;
  });

const validateAssignmentsOptional = body("assignments")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.assignmentsInvalid"));
    for (const a of arr) {
      if (!a || typeof a !== "object") throw new Error(t("validation.assignmentsInvalid"));
      if (!a.employeeRef || !/^[a-f\d]{24}$/i.test(String(a.employeeRef)))
        throw new Error(t("validation.employeeRef"));
      if (a.role && !["lead", "member"].includes(String(a.role)))
        throw new Error(t("validation.assignmentRole"));
      if (a.plannedMinutes !== undefined && typeof a.plannedMinutes !== "number")
        throw new Error(t("validation.numberField"));
      if (a.actualMinutes !== undefined && typeof a.actualMinutes !== "number")
        throw new Error(t("validation.numberField"));
    }
    return true;
  });

const validateStepsOptional = body("steps")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((steps, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(steps)) throw new Error(t("validation.stepsInvalid"));
    for (const s of steps) {
      if (!s || typeof s !== "object") throw new Error(t("validation.stepsInvalid"));
      if (s.type && !["task", "inspection", "safety", "handover"].includes(String(s.type)))
        throw new Error(t("validation.stepType"));
      if (s.estimatedMinutes !== undefined && typeof s.estimatedMinutes !== "number")
        throw new Error(t("validation.numberField"));
      if (s.actualMinutes !== undefined && typeof s.actualMinutes !== "number")
        throw new Error(t("validation.numberField"));
    }
    return true;
  });

const validateMaterialsOptional = body("materials")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((arr, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(arr)) throw new Error(t("validation.materialsInvalid"));
    for (const m of arr) {
      if (!m || typeof m !== "object") throw new Error(t("validation.materialsInvalid"));
      if (m.quantity !== undefined && typeof m.quantity !== "number") throw new Error(t("validation.numberField"));
      if (m.costPerUnit !== undefined && typeof m.costPerUnit !== "number") throw new Error(t("validation.numberField"));
      if (m.totalCost !== undefined && typeof m.totalCost !== "number") throw new Error(t("validation.numberField"));
      if (m.chargeTo && !["expense", "customer", "internal"].includes(String(m.chargeTo)))
        throw new Error(t("validation.materialChargeTo"));
    }
    return true;
  });

const validateFinanceOptional = body("finance")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (typeof val !== "object") throw new Error(t("validation.financeInvalid"));
    if (val.billable !== undefined && typeof val.billable !== "boolean")
      throw new Error(t("validation.booleanField"));
    ["revenueAmountSnapshot", "laborCostSnapshot", "materialCostSnapshot"].forEach((k) => {
      if (val[k] !== undefined && typeof val[k] !== "number") throw new Error(t("validation.numberField"));
    });
    return true;
  });

// --- CREATE ---
export const validateCreateJob = [
  body("source")
    .notEmpty()
    .isIn(["manual", "recurrence", "contract", "adhoc"])
    .withMessage((_, { req }) => translate("validation.invalidSource", req.locale || getLogLocale(), translations)),
  body("apartmentRef")
    .notEmpty()
    .isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidApartment", req.locale || getLogLocale(), translations)),
  body("serviceRef")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidService", req.locale || getLogLocale(), translations)),
  body("contractRef")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidContract", req.locale || getLogLocale(), translations)),
  body("categoryRef")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidCategory", req.locale || getLogLocale(), translations)),
  body("status")
    .optional()
    .isIn(["draft", "scheduled", "in_progress", "paused", "completed", "cancelled"])
    .withMessage((_, { req }) => translate("validation.invalidStatus", req.locale || getLogLocale(), translations)),

  body("title").optional().customSanitizer(parseIfJson).custom((v) => typeof v === "object"),
  body("description").optional().customSanitizer(parseIfJson).custom((v) => typeof v === "object"),
  validateScheduleOptional,

  body("expectedDurationMinutes").optional().isInt({ min: 0 }),
  body("actualDurationMinutes").optional().isInt({ min: 0 }),

  validateAssignmentsOptional,
  validateStepsOptional,
  validateMaterialsOptional,

  body("deliverables").optional().customSanitizer(parseIfJson).custom((v) => typeof v === "object"),
  validateFinanceOptional,

  body("priority").optional().isIn(["low", "normal", "high", "critical"]),
  body("tags").optional().customSanitizer(parseIfJson).custom((v) => Array.isArray(v)),
  body("isActive").optional().toBoolean().isBoolean(),

  validateRequest,
];

// --- UPDATE ---
export const validateUpdateJob = [
  body("code").optional().isString(),
  body("source").optional().isIn(["manual", "recurrence", "contract", "adhoc"]),
  body("apartmentRef").optional().isMongoId(),
  body("serviceRef").optional().isMongoId(),
  body("contractRef").optional().isMongoId(),
  body("categoryRef").optional().isMongoId(),
  body("status").optional().isIn(["draft", "scheduled", "in_progress", "paused", "completed", "cancelled"]),

  body("title").optional().customSanitizer(parseIfJson).custom((v) => typeof v === "object"),
  body("description").optional().customSanitizer(parseIfJson).custom((v) => typeof v === "object"),
  validateScheduleOptional,

  body("expectedDurationMinutes").optional().isInt({ min: 0 }),
  body("actualDurationMinutes").optional().isInt({ min: 0 }),

  validateAssignmentsOptional,
  validateStepsOptional,
  validateMaterialsOptional,
  body("deliverables").optional().customSanitizer(parseIfJson).custom((v) => typeof v === "object"),
  validateFinanceOptional,

  body("priority").optional().isIn(["low", "normal", "high", "critical"]),
  body("tags").optional().customSanitizer(parseIfJson).custom((v) => Array.isArray(v)),
  body("isActive").optional().toBoolean().isBoolean(),

  validateRequest,
];

// --- List query (admin) ---
export const validateAdminQuery = [
  query("status").optional().isIn(["draft", "scheduled", "in_progress", "paused", "completed", "cancelled"]),
  query("source").optional().isIn(["manual", "recurrence", "contract", "adhoc"]),
  query("priority").optional().isIn(["low", "normal", "high", "critical"]),
  query("apartment").optional().isMongoId(),
  query("service").optional().isMongoId(),
  query("contract").optional().isMongoId(),
  query("employee").optional().isMongoId(),
  query("code").optional().isString(),
  query("q").optional().isString(),
  query("plannedFrom").optional().isISO8601(),
  query("plannedTo").optional().isISO8601(),
  query("dueFrom").optional().isISO8601(),
  query("dueTo").optional().isISO8601(),
  query("isActive").optional().toBoolean().isBoolean(),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("page").optional().isInt({ min: 1, max: 10000 }),
  validateRequest,
];
