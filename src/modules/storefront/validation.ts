import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

/* ===== Admin (mevcut) ===== */
export const validateUpsertSettings = [
  body("currency").optional().isString().isLength({ min: 3, max: 3 }),
  body("currencies").optional().isArray(),
  body("locale").optional().isString(),
  body("locales").optional().isArray(),
  body("priceIncludesTax").optional().toBoolean().isBoolean(),
  body("measurement").optional().isIn(["metric", "imperial"]),
  body("menus").optional().isArray(),
  body("banners").optional().isArray(),
  body("featuredCategories").optional().isArray(),
  body("featuredProducts").optional().isArray(),
  body("socials").optional().isObject(),
  validateRequest,
];

/* ---- Banners (admin) ---- */
export const validateBannerCreateByMedia = [
  body("mediaId").isMongoId(),
  body("position").optional().isString(),
  body("title").optional().isString(),
  body("subtitle").optional().isString(),
  body("href").optional().isString(),
  body("isActive").optional().toBoolean().isBoolean(),
  body("order").optional().isInt(),
  body("key").optional().isString(),
  validateRequest,
];

export const validateBannerUpload = [
  body("position").optional().isString(),
  body("title").optional().isString(),
  body("subtitle").optional().isString(),
  body("href").optional().isString(),
  body("isActive").optional().toBoolean().isBoolean(),
  body("order").optional().isInt(),
  body("key").optional().isString(),
  validateRequest,
];

export const validateBannerUpdate = [
  param("key").isString().notEmpty(),
  body("mediaId").optional().isMongoId(),
  body("position").optional().isString(),
  body("title").optional().isString(),
  body("subtitle").optional().isString(),
  body("href").optional().isString(),
  body("isActive").optional().toBoolean().isBoolean(),
  body("order").optional().isInt(),
  validateRequest,
];

export const validateBannerDelete = [
  param("key").isString().notEmpty(),
  validateRequest,
];

export const validateBannerReorder = [
  body("orders").isArray().custom((arr) =>
    arr.every((x: any) => typeof x?.key === "string" && Number.isInteger(x?.order))
  ),
  validateRequest,
];

/* ===== Public (yeni) ===== */
export const validatePublicFields = [
  query("fields").optional().isString(), // comma: banners,menus,locale,…
  validateRequest,
];

export const validatePublicBanners = [
  query("position").optional().isString(),
  query("positions").optional().isString(), // comma list
  query("limit").optional().isInt({ min: 1, max: 100 }),
  validateRequest,
];

export const validatePublicMenuByKey = [
  param("key").isString().notEmpty(),
  validateRequest,
];
