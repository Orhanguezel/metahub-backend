// src/modules/shipping/shipping-method.validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "../i18n";

const tReq = (req: any, k: string) => translate(`common.${k}`, req.locale || getLogLocale(), translations);

export const validateMethodId = [
  param("id").isMongoId().withMessage((_, { req }) => tReq(req, "invalidId")),
  validateRequest,
];

export const validateCreateMethod = [
  body("code").trim().notEmpty(),
  body("name").notEmpty(),
  body("active").optional().isBoolean().toBoolean(),
  body("zones").optional().isArray(),
  body("currency").optional().isString(),
  body("calc").isIn(["flat", "table", "free_over"]),
  body("flatPrice_cents").optional().isInt({ min: 0 }),
  body("freeOver_cents").optional().isInt({ min: 0 }),
  body("table").optional().isArray(),
  body("order").optional().isInt({ min: 0 }),
  validateRequest,
];

export const validateUpdateMethod = [
  body("name").optional(),
  body("active").optional().isBoolean().toBoolean(),
  body("zones").optional().isArray(),
  body("currency").optional().isString(),
  body("calc").optional().isIn(["flat", "table", "free_over"]),
  body("flatPrice_cents").optional().isInt({ min: 0 }),
  body("freeOver_cents").optional().isInt({ min: 0 }),
  body("table").optional().isArray(),
  body("order").optional().isInt({ min: 0 }),
  validateRequest,
];

/** Public list / quote */
export const validatePublicList = [
  query("zoneId").optional().isMongoId(),
  validateRequest,
];

export const validateQuote = [
  body("code").notEmpty().isString(),
  body("subtotal_cents").notEmpty().isInt({ min: 0 }),
  body("weight_grams").optional().isInt({ min: 0 }),
  body("zoneId").optional().isMongoId(),
  validateRequest,
];

export const validateTrack = [
  param("trackingNo").isString().trim().notEmpty(),
  validateRequest,
];
