import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// helpers
const parseIfJson = (v: any) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

const isTL = (req: any, key: string) =>
  translate(key, (req as any).locale || getLogLocale(), require("./i18n").default);

// ---- Field validators ----
const validateMultilangRequired = (field: string) =>
  body(field)
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      const t = (k: string) => isTL(req, k);
      if (!val || typeof val !== "object") throw new Error(t("validation.multilangObject"));
      const hasAny = Object.values(val).some((s) => typeof s === "string" && s.trim().length > 0);
      if (!hasAny) throw new Error(t("validation.nameRequired"));
      return true;
    });

const validateMultilangOptional = (field: string) =>
  body(field)
    .optional()
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      const t = (k: string) => isTL(req, k);
      if (!val || typeof val !== "object") throw new Error(t("validation.multilangObject"));
      return true;
    });

const validateCrewOptional = body("crew")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => isTL(req, k);
    if (!val || typeof val !== "object") throw new Error(t("validation.crewInvalid"));
    for (const k of ["min", "max", "recommended"]) {
      if (val[k] !== undefined && typeof val[k] !== "number") throw new Error(t("validation.number"));
    }
    return true;
  });

const validateStep = (s: any, t: (k: string) => string) => {
  if (!s || typeof s !== "object") throw new Error(t("validation.stepInvalid"));
  if (!s.title || typeof s.title !== "object") throw new Error(t("validation.stepTitle"));
  if (s.type && !["task", "inspection", "safety", "handover"].includes(s.type))
    throw new Error(t("validation.stepType"));
  if (s.estimatedMinutes !== undefined && typeof s.estimatedMinutes !== "number")
    throw new Error(t("validation.number"));
  // checklist
  if (Array.isArray(s.checklist)) {
    for (const c of s.checklist) {
      if (!c || typeof c !== "object") throw new Error(t("validation.checklistInvalid"));
      if (!c.text || typeof c.text !== "object") throw new Error(t("validation.checklistText"));
      if (c.minPhotos !== undefined && typeof c.minPhotos !== "number")
        throw new Error(t("validation.number"));
    }
  }
  // quality
  if (Array.isArray(s.quality)) {
    for (const q of s.quality) {
      if (!q || typeof q !== "object") throw new Error(t("validation.qualityInvalid"));
      if (!q.key || typeof q.key !== "string") throw new Error(t("validation.qualityKey"));
      if (q.type && !["boolean", "number", "select"].includes(q.type))
        throw new Error(t("validation.qualityType"));
    }
  }
  return true;
};

const validateSteps = body("steps")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => isTL(req, k);
    if (!Array.isArray(val)) throw new Error(t("validation.stepsInvalid"));
    val.forEach((s) => validateStep(s, t));
    return true;
  });

const validateMaterials = body("materials")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => isTL(req, k);
    if (!Array.isArray(val)) throw new Error(t("validation.materialsInvalid"));
    for (const m of val) {
      if (!m || typeof m !== "object") throw new Error(t("validation.materialItemInvalid"));
      if (m.quantity !== undefined && typeof m.quantity !== "number")
        throw new Error(t("validation.number"));
    }
    return true;
  });

const validateDeliverables = body("deliverables")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => isTL(req, k);
    if (!val || typeof val !== "object") throw new Error(t("validation.deliverablesInvalid"));
    return true;
  });

const validateRecurrence = body("recurrence")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((rc, { req }) => {
    const t = (k: string) => isTL(req, k);
    if (!rc || typeof rc !== "object") throw new Error(t("validation.recurrenceInvalid"));
    if (rc.unit && !["day", "week", "month"].includes(rc.unit))
      throw new Error(t("validation.recurrenceUnit"));
    if (rc.every !== undefined && (typeof rc.every !== "number" || rc.every < 1))
      throw new Error(t("validation.number"));
    if (rc.daysOfWeek) {
      if (!Array.isArray(rc.daysOfWeek)) throw new Error(t("validation.daysOfWeek"));
      for (const d of rc.daysOfWeek) if (typeof d !== "number" || d < 0 || d > 6) throw new Error(t("validation.daysOfWeek"));
    }
    if (rc.dayOfMonth && (rc.dayOfMonth < 1 || rc.dayOfMonth > 31))
      throw new Error(t("validation.dayOfMonth"));
    return true;
  });

const validateApplicability = body("applicability")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((ap, { req }) => {
    const t = (k: string) => isTL(req, k);
    if (!ap || typeof ap !== "object") throw new Error(t("validation.applicabilityInvalid"));
    return true;
  });

// --- Create ---
export const validateCreateOperationTemplate = [
  body("code").optional().isString().trim(),
  validateMultilangRequired("name"),
  validateMultilangOptional("description"),
  body("serviceRef").optional().isMongoId(),
  body("defaultDurationMinutes").optional().isFloat({ min: 0 }),
  validateCrewOptional,
  validateSteps,
  validateMaterials,
  validateDeliverables,
  validateRecurrence,
  validateApplicability,
  body("tags").optional().isArray(),
  body("version").optional().isInt({ min: 1 }),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

// --- Update ---
export const validateUpdateOperationTemplate = [
  body("code").optional().isString().trim(),
  validateMultilangOptional("name"),
  validateMultilangOptional("description"),
  body("serviceRef").optional().isMongoId(),
  body("defaultDurationMinutes").optional().isFloat({ min: 0 }),
  validateCrewOptional,
  validateSteps,
  validateMaterials,
  validateDeliverables,
  validateRecurrence,
  validateApplicability,
  body("tags").optional().isArray(),
  body("version").optional().isInt({ min: 1 }),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

// --- Common ---
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) => isTL(req, "validation.invalidObjectId")),
  validateRequest,
];

export const validateAdminQuery = [
  query("q").optional().isString(),
  query("serviceRef").optional().isMongoId(),
  query("categoryRef").optional().isMongoId(),
  query("apartmentRef").optional().isMongoId(),
  query("isActive").optional().toBoolean().isBoolean(), // var ise boolean’a çevir
  query("tag").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }), // 500 ile uyumlu
  validateRequest,
];
