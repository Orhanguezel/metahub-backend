// src/modules/shipping/shipment.validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateShipmentId = [
  param("id").isMongoId().withMessage("Invalid shipment ID."),
  validateRequest,
];

// create
export const validateCreateShipment = [
  body("order").notEmpty().isMongoId(),
  body("recipientName").trim().notEmpty(),
  body("trackingNumber").optional().trim().isString(),
  body("deliveryType").optional().isIn(["standard","express","same-day"]),
  body("packages").optional().isArray(),
  body("packages.*.packageNo").optional().isString().notEmpty(),
  body("packages.*.items").optional().isArray({ min: 1 }),
  body("packages.*.items.*.orderItemId").optional().isMongoId(),
  body("packages.*.items.*.qty").optional().isInt({ min: 1 }),
  validateRequest,
];

// status aksiyonları
export const validateMarkLabelPrinted = [
  param("id").isMongoId(),
  body("trackingNumber").optional().isString().trim(),
  body("labelUrl").optional().isString(),
  validateRequest,
];

export const validateMarkShipped = [
  param("id").isMongoId(),
  body("trackingNumber").optional().isString().trim(),
  validateRequest,
];

export const validateUpdateShipment = [
  body("trackingNumber").optional().trim().notEmpty(),
  body("recipientName").optional().trim().notEmpty(),
  body("status").optional().isIn([
    "pending","packed","shipped","in_transit","out_for_delivery","delivered","returned","canceled"
  ]),
  body("deliveryType").optional().isIn(["standard","express","same-day"]),
  validateRequest,
];

export const validateListShipments = [
  query("status").optional().isIn([
    "pending","packed","shipped","in_transit","out_for_delivery","delivered","returned","canceled"
  ]),
  query("q").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

export const validateAppendEvent = [
  param("id").isMongoId(),
  body("code").notEmpty().isString(),
  body("desc").optional().isString(),
  body("location").optional().isString(),
  validateRequest,
];

export const validateMarkDelivered = [ param("id").isMongoId(), validateRequest ];