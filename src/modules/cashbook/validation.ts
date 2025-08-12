import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

/* Accounts */
export const validateCreateAccount = [
  body("code").exists().customSanitizer(toUpperSnake).matches(/^[A-Z0-9_]+$/).withMessage((_, { req }) =>
    translate("validation.invalidCode", req.locale || getLogLocale(), translations)
  ),
  body("name").exists().isString().trim(),
  body("type").exists().isIn(["cash", "bank", "other"]).withMessage((_, { req }) =>
    translate("validation.invalidAccountType", req.locale || getLogLocale(), translations)
  ),
  body("currency").exists().isIn(["USD", "EUR", "TRY"]).withMessage((_, { req }) =>
    translate("validation.invalidCurrency", req.locale || getLogLocale(), translations)
  ),
  body("openingBalance").optional().isFloat({ min: 0 }),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

export const validateUpdateAccount = [
  body("code").optional().customSanitizer(toUpperSnake).matches(/^[A-Z0-9_]+$/).withMessage((_, { req }) =>
    translate("validation.invalidCode", req.locale || getLogLocale(), translations)
  ),
  body("name").optional().isString().trim(),
  body("type").optional().isIn(["cash", "bank", "other"]).withMessage((_, { req }) =>
    translate("validation.invalidAccountType", req.locale || getLogLocale(), translations)
  ),
  body("currency").optional().isIn(["USD", "EUR", "TRY"]).withMessage((_, { req }) =>
    translate("validation.invalidCurrency", req.locale || getLogLocale(), translations)
  ),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

/* Entries */
export const validateCreateEntry = [
  body("accountId").exists().isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  body("date").optional().isISO8601().toDate().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),
  body("direction").exists().isIn(["in", "out"]).withMessage((_, { req }) =>
    translate("validation.invalidDirection", req.locale || getLogLocale(), translations)
  ),
  body("amount").exists().isFloat({ min: 0 }).withMessage((_, { req }) =>
    translate("validation.amountPositive", req.locale || getLogLocale(), translations)
  ),
  body("description").optional().isString(),
  body("category").optional().isString(),
  body("tags").optional().isArray(),
  // bağlamsal referanslar
  body("apartmentId").optional().isMongoId(),
  body("contractId").optional().isMongoId(),
  body("invoiceId").optional().isMongoId(),
  body("paymentId").optional().isMongoId(),
  body("expenseId").optional().isMongoId(),
  body("jobId").optional().isMongoId(),
  validateRequest,
];

export const validateUpdateEntry = [
  body("date").optional().isISO8601().toDate(),
  body("direction").optional().isIn(["in", "out"]),
  body("amount").optional().isFloat({ min: 0 }),
  body("description").optional().isString(),
  body("category").optional().isString(),
  body("tags").optional().isArray(),
  validateRequest,
];

export const validateEntriesAdminQuery = [
  query("accountId").optional().isMongoId(),
  query("apartmentId").optional().isMongoId(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("direction").optional().isIn(["in", "out"]),
  query("category").optional().isString(),
  query("reconciled").optional().toBoolean().isBoolean(),
  validateRequest,
];

/* Reconciliation */
export const validateReconcile = [
  body("entryIds").exists().isArray().withMessage((_, { req }) =>
    translate("validation.arrayField", req.locale || getLogLocale(), translations)
  ),
  body("reconciliationId").optional().isString().trim(),
  validateRequest,
];
