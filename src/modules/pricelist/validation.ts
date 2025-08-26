import { body, param, query, ValidationChain } from "express-validator";
import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

const handle = (req: Request, res: Response, next: NextFunction) => {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  return res.status(400).json({ success: false, message: "validation.invalid_params", errors: r.array() });
};

export const validateObjectId = (name: string): ValidationChain[] => [
  param(name).isMongoId().withMessage("invalidObjectId"),
  handle as any,
];

const CURRENCIES = ["USD","EUR","TRY","GBP"];
const PERIODS = ["weekly","ten_days","fifteen_days","monthly","quarterly","yearly","once"];
const STATUSES = ["draft","active","archived"];
const CATEGORIES = ["menuitem_variant","menuitem_modifier","deposit","delivery_fee","service_fee","custom"];

/* ================= PriceList (master) ================= */
export const validateCreatePriceList = [
  body("code").optional().isString(),
  body("name").optional(),                 // i18n json body; transformNestedFields ile parse ediliyor
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
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("page").optional().isInt({ min: 1 }),
  query("sort").optional().isString(),
  handle as any,
];

/* ================= List-mode Items ================= */
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

/* ================= Catalog Items (Admin) ================= */
export const validateCatalogAdminQuery = [
  query("q").optional().isString(),
  query("code").optional().isString(),
  query("codes").optional().isString(),      // comma-separated
  query("category").optional().isIn(CATEGORIES),
  query("tags").optional().isString(),       // comma-separated
  query("isActive").optional().isBoolean().toBoolean(),
  query("validOn").optional().isISO8601(),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("page").optional().isInt({ min: 1 }),
  query("sort").optional().isString(),
  handle as any,
];

export const validateCreateCatalogItem = [
  body("code").isString().matches(/^[a-z0-9][a-z0-9-_]{1,63}$/i),
  body("name").optional(), // i18n object; parsed by transformNestedFields
  body("description").optional(),
  body("category").isIn(CATEGORIES),
  body("price").isFloat({ min: 0 }),
  body("currency").optional().isIn(CURRENCIES),
  body("tags").optional(),
  body("validFrom").optional().isISO8601(),
  body("validTo").optional().isISO8601(),
  body("source").optional(), // mixed
  body("isActive").optional().isBoolean().toBoolean(),
  handle as any,
];

export const validateUpdateCatalogItem = [
  body("code").optional().isString().matches(/^[a-z0-9][a-z0-9-_]{1,63}$/i),
  body("name").optional(),
  body("description").optional(),
  body("category").optional().isIn(CATEGORIES),
  body("price").optional().isFloat({ min: 0 }),
  body("currency").optional().isIn(CURRENCIES),
  body("tags").optional(),
  body("validFrom").optional({ nullable: true }).isISO8601(),
  body("validTo").optional({ nullable: true }).isISO8601(),
  body("source").optional(),
  body("isActive").optional().isBoolean().toBoolean(),
  handle as any,
];

/* ================= Public validators ================= */
export const validatePublicCatalogQuery = [
  query("codes").optional().isString(),
  query("category").optional().isIn(CATEGORIES),
  query("tags").optional().isString(),
  query("validOn").optional().isISO8601(),
  query("q").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  handle as any,
];

export const validatePublicPriceQuery = [
  query("serviceCode").isString().notEmpty(),
  query("period").isIn(PERIODS),
  query("onDate").optional().isISO8601(),
  handle as any,
];
