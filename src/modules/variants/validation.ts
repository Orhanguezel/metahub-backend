import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const tByReq = (req: any, k: string) =>
  translate(k, req?.locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const SKU_RE = /^[A-Z0-9\-_]+$/i;

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_: any, { req }: any) => tByReq(req, "validation.invalidObjectId")),
  validateRequest,
];

const validateOptionsOptional = body("options")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((obj, { req }) => {
    if (obj === undefined) return true;
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return true;
    throw new Error(tByReq(req, "validation.optionsInvalid"));
  });

/** price: float (opsiyon) | price_cents: int (opsiyon) -> en az bir tanesi gerekli */
const requirePriceEither = body().custom((_, { req }) => {
  const hasFloat = req.body.price != null && req.body.price !== "";
  const hasCents = req.body.price_cents != null && req.body.price_cents !== "";
  if (!hasFloat && !hasCents) {
    throw new Error(tByReq(req, "validation.priceInvalid"));
  }
  return true;
});

export const validateCreateVariant = [
  body("product").notEmpty().isMongoId().withMessage((_: any, { req }: any) => tByReq(req, "validation.productRequired")),
  body("sku").notEmpty().withMessage((_: any, { req }: any) => tByReq(req, "validation.skuRequired"))
              .matches(SKU_RE).withMessage((_: any, { req }: any) => tByReq(req, "validation.skuInvalid")),
  body("barcode").optional().isString(),
  validateOptionsOptional,

  // price alanları
  body("price").optional().isFloat({ min: 0 }),
  body("price_cents").optional().isInt({ min: 0 }),
  body("salePrice").optional().isFloat({ min: 0 }),
  body("offer_price_cents").optional().isInt({ min: 0 }),

  body("currency").optional().isString().withMessage((_: any, { req }: any) => tByReq(req, "validation.currencyInvalid")),
  body("stock").optional().isInt({ min: 0 }).withMessage((_: any, { req }: any) => tByReq(req, "validation.stockInvalid")),
  body("image").optional().isString(),
  body("isActive").optional().isBoolean().toBoolean(),
  requirePriceEither,
  validateRequest,
];

export const validateUpdateVariant = [
  body("product").optional().isMongoId(),
  body("sku").optional().matches(SKU_RE).withMessage((_: any, { req }: any) => tByReq(req, "validation.skuInvalid")),
  body("barcode").optional().isString(),
  validateOptionsOptional,

  body("price").optional().isFloat({ min: 0 }),
  body("price_cents").optional().isInt({ min: 0 }),
  body("salePrice").optional().isFloat({ min: 0 }),
  body("offer_price_cents").optional().isInt({ min: 0 }),

  body("currency").optional().isString().withMessage((_: any, { req }: any) => tByReq(req, "validation.currencyInvalid")),
  body("stock").optional().isInt({ min: 0 }).withMessage((_: any, { req }: any) => tByReq(req, "validation.stockInvalid")),
  body("image").optional().isString(),
  body("isActive").optional().isBoolean().toBoolean(),
  validateRequest,
];

export const validateVariantListQuery = [
  query("product").optional().isMongoId(),
  query("q").optional().isString(),
  query("isActive").optional().isBoolean().toBoolean(),
  query("currency").optional().isString(),
  query("min_price").optional().isFloat({ min: 0 }),
  query("max_price").optional().isFloat({ min: 0 }),
  query("min_stock").optional().isInt({ min: 0 }),
  query("max_stock").optional().isInt({ min: 0 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  query("sort").optional().isIn(["created_desc","created_asc","price_asc","price_desc","stock_desc","stock_asc","sku_asc","sku_desc"]),
  validateRequest,
];

export const validateResolveVariant = [
  body("product").notEmpty().isMongoId().withMessage((_: any, { req }: any) => tByReq(req, "validation.productRequired")),
  body("options").customSanitizer(parseIfJson).custom((obj, { req }) => {
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return true;
    throw new Error(tByReq(req, "validation.optionsInvalid"));
  }),
  validateRequest,
];
