import { body, param, query, ValidationChain, validationResult } from "express-validator";
import type { Request, Response, NextFunction } from "express";

const handle = (req: Request, res: Response, next: NextFunction) => {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  return res.status(400).json({ success: false, message: "validation.invalid_params", errors: r.array() });
};

export const validateObjectId = (name: string): ValidationChain[] => [
  param(name).isMongoId().withMessage("invalidObjectId"),
  handle as any,
];

const CURRENCIES = ["USD","EUR","TRY"];
const PERIODS = ["weekly","ten_days","fifteen_days","monthly","quarterly","yearly","once"];
const STATUSES = ["draft","active","archived"];

export const validateCreatePriceList = [
  body("code").optional().isString(),
  body("name").optional(),
  body("description").optional(),
  body("defaultCurrency").isIn(CURRENCIES),
  body("effectiveFrom").optional().isISO8601(),
  body("effectiveTo").optional({ nullable: true }).isISO8601(),
  body("status").optional().isIn(STATUSES),
  body("isActive").optional().isBoolean().toBoolean(),
  handle as any,
];

export const validateUpdatePriceList = [
  body("code").optional().isString(),
  body("name").optional(),
  body("description").optional(),
  body("defaultCurrency").optional().isIn(CURRENCIES),
  body("effectiveFrom").optional().isISO8601(),
  body("effectiveTo").optional({ nullable: true }).isISO8601(),
  body("status").optional().isIn(STATUSES),
  body("isActive").optional().isBoolean().toBoolean(),
  handle as any,
];

export const validatePriceListAdminQuery = [
  query("q").optional().isString(),
  query("status").optional().isIn(STATUSES),
  query("isActive").optional().isBoolean().toBoolean(),
  query("effectiveAt").optional().isISO8601(),
  handle as any,
];

export const validateCreatePriceListItem = [
  body("serviceCode").isString().notEmpty(),
  body("amount").isFloat({ min: 0 }),
  body("currency").optional().isIn(CURRENCIES),
  body("period").isIn(PERIODS),
  body("notes").optional().isString(),
  body("isActive").optional().isBoolean().toBoolean(),
  handle as any,
];

export const validateUpdatePriceListItem = [
  body("serviceCode").optional().isString(),
  body("amount").optional().isFloat({ min: 0 }),
  body("currency").optional().isIn(CURRENCIES),
  body("period").optional().isIn(PERIODS),
  body("notes").optional().isString(),
  body("isActive").optional().isBoolean().toBoolean(),
  handle as any,
];

export const validatePriceListItemsAdminQuery = [
  query("serviceCode").optional().isString(),
  query("period").optional().isIn(PERIODS),
  query("isActive").optional().isBoolean().toBoolean(),
  handle as any,
];
