import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateRefund = [
  // route: /orders/:orderRef/refunds → orderNo ya da ObjectId (boş olmasın yeter)
  param("orderRef").isString().trim().notEmpty(),
  body("amount_cents").isInt({ min: 1 }),
  body("reason").optional().isString().isLength({ max: 500 }),
  validateRequest,
];

export const validateListRefunds = [
  query("status").optional().isIn(["pending", "succeeded", "failed"]),
  query("q").optional().isString(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
  validateRequest,
];

export const validateRefundId = [
  param("id").isMongoId(),
  validateRequest,
];

export const validateUpdateRefund = [
  param("id").isMongoId(),
  body("status").optional().isIn(["pending", "succeeded", "failed"]),
  body("reason").optional().isString().isLength({ max: 500 }),
  // Ham cevap güncellemesi gerekiyorsa:
  body("raw").optional().isObject(),
  validateRequest,
];
