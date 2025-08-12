import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { isValidObjectId } from "@/core/utils/validation";

const parseIfJson = (v: any) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* ---------- Definitions ---------- */
export const validateCreateDefinition = [
  body("name").isString().trim().notEmpty().withMessage((_, { req }) =>
    translate("validation.requiredName", req.locale || getLogLocale(), translations)
  ),
  body("kind")
    .isIn([
      "ar_aging","ap_aging","revenue","expense","cashflow",
      "profitability","billing_forecast","invoice_collections",
      "employee_utilization","workload","service_performance",
    ])
    .withMessage((_, { req }) =>
      translate("validation.invalidKind", req.locale || getLogLocale(), translations)
    ),
  body("defaultFilters").optional().customSanitizer(parseIfJson).custom(() => true),
  body("view").optional().customSanitizer(parseIfJson).custom(() => true),
  body("exportFormats").optional().isArray(),
  body("schedule").optional().customSanitizer(parseIfJson).custom(() => true),
  body("isActive").optional().toBoolean().isBoolean(),
  body("tags").optional().isArray(),
  body("createdByRef").optional().isMongoId(),
  body("updatedByRef").optional().isMongoId(),
  validateRequest,
];

export const validateUpdateDefinition = [
  body("name").optional().isString().trim().notEmpty(),
  body("kind")
    .optional()
    .isIn([
      "ar_aging","ap_aging","revenue","expense","cashflow",
      "profitability","billing_forecast","invoice_collections",
      "employee_utilization","workload","service_performance",
    ]),
  body("defaultFilters").optional().customSanitizer(parseIfJson).custom(() => true),
  body("view").optional().customSanitizer(parseIfJson).custom(() => true),
  body("exportFormats").optional().isArray(),
  body("schedule").optional().customSanitizer(parseIfJson).custom(() => true),
  body("isActive").optional().toBoolean().isBoolean(),
  body("tags").optional().isArray(),
  body("createdByRef").optional().isMongoId(),
  body("updatedByRef").optional().isMongoId(),
  validateRequest,
];

export const validateDefinitionListQuery = [
  query("q").optional().isString(),
  query("kind").optional().isString(),
  query("isActive").optional().toBoolean().isBoolean(),
  query("tag").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

/* ---------- Runs ---------- */
export const validateCreateRun = [
  body("definitionRef").optional().isMongoId(),
  body("kind").optional().isString(),
  body("triggeredBy").optional().isIn(["manual","schedule","api"]),
  body("filtersUsed").optional().customSanitizer(parseIfJson).custom(() => true),
  // En azından definitionRef ya da kind gelsin:
  body().custom((val) => {
    if (!val.definitionRef && !val.kind) throw new Error("definitionRef_or_kind_required");
    return true;
  }),
  validateRequest,
];

export const validateRunListQuery = [
  query("q").optional().isString(),
  query("kind").optional().isString(),
  query("status").optional().isIn(["queued","running","success","error","cancelled"]),
  query("definitionRef").optional().isMongoId(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
