import express from "express";
import { publicListByProduct, publicGetBySku, publicResolveVariant } from "./public.controller";
import { validateRequest } from "@/core/middleware/validateRequest";
import { param, body, query } from "express-validator";
import { validateResolveVariant } from "./validation";

const router = express.Router();

/** List by product */
router.get(
  "/by-product/:product",
  param("product").isMongoId(),
  query("onlyActive").optional().isBoolean().toBoolean(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
  publicListByProduct
);

/** Get by SKU */
router.get(
  "/sku/:sku",
  param("sku").isString(),
  validateRequest,
  publicGetBySku
);

/** Resolve by options */
router.post(
  "/resolve",
  validateResolveVariant,
  publicResolveVariant
);

export default router;
