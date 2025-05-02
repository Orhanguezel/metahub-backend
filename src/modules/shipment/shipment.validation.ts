import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Shipment Validation
export const validateCreateShipment = [
  body("order").notEmpty().isMongoId().withMessage("Order ID is required and must be a valid Mongo ID."),
  body("trackingNumber").notEmpty().withMessage("Tracking number is required."),
  body("recipientName").notEmpty().withMessage("Recipient name is required."),
  body("status").optional().isIn(["pending", "shipped", "delivered", "returned"]).withMessage("Invalid status."),
  body("deliveryType").optional().isIn(["standard", "express", "same-day"]).withMessage("Invalid delivery type."),
  validateRequest,
];

// ✅ Update Shipment Validation
export const validateUpdateShipment = [
  body("trackingNumber").optional().notEmpty().withMessage("Tracking number cannot be empty."),
  body("status").optional().isIn(["pending", "shipped", "delivered", "returned"]).withMessage("Invalid status."),
  body("deliveryType").optional().isIn(["standard", "express", "same-day"]).withMessage("Invalid delivery type."),
  validateRequest,
];

// ✅ Param ID Validation
export const validateShipmentId = [
  param("id").isMongoId().withMessage("Invalid shipment ID."),
  validateRequest,
];
