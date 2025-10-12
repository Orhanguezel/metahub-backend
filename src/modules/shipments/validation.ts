// src/modules/shipments/validation.ts

import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const vList = [
  query("status").optional().isIn([
    "pending","packed","shipped","in_transit","out_for_delivery","delivered","returned","canceled"
  ]),
  query("carrier").optional().isString(),
  query("q").optional().isString(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

export const vId = [
  param("id").isMongoId(),
  validateRequest,
];

export const vCreateForOrderNo = [
  param("orderNo").notEmpty().isString(),
  body("carrier").optional().isString(),
  body("recipientName").optional().isString(),
  body("trackingNumber").optional().isString(),
  // İsteğe bağlı paket/kalem bilgisi — mevcut modelde saklamıyoruz; event.raw içine gömeriz
  body("packages").optional().isArray(),
  validateRequest,
];

export const vMarkLabel = [
  param("id").isMongoId(),
  body("labelUrl").optional().isURL().isString(),
  validateRequest,
];

export const vMarkShipped = [
  param("id").isMongoId(),
  body("trackingNumber").optional().isString(),
  // opsiyonel ledger için kalemler
  body("items").optional().isArray(),
  validateRequest,
];

export const vMarkDelivered = [
  param("id").isMongoId(),
  validateRequest,
];

export const vDelete = [
  param("id").isMongoId(),
  validateRequest,
];

export const vTrackPublic = [
  param("trackingNo").notEmpty().isString(),
  validateRequest,
];
