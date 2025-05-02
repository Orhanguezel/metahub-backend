import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Yeni ödeme oluşturma validasyonu
export const validatePaymentCreate = [
  body("order")
    .notEmpty().withMessage("Order ID is required.")
    .isMongoId().withMessage("Order ID must be a valid Mongo ID."),
  
  body("amount")
    .notEmpty().withMessage("Amount is required.")
    .isNumeric().withMessage("Amount must be a number.")
    .isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0."),
  
  body("method")
    .notEmpty().withMessage("Payment method is required.")
    .isIn(["cash_on_delivery", "credit_card", "paypal"])
    .withMessage("Invalid payment method."),

  validateRequest,
];

// ✅ Ödeme metodunu güncelleme validasyonu
export const validatePaymentUpdateMethod = [
  param("id")
    .notEmpty().withMessage("Payment ID is required.")
    .isMongoId().withMessage("Invalid payment ID."),
  
  body("method")
    .notEmpty().withMessage("Payment method is required.")
    .isIn(["cash_on_delivery", "credit_card", "paypal"])
    .withMessage("Invalid payment method."),

  validateRequest,
];

// ✅ Ödeme ID'si validasyonu
export const validatePaymentIdParam = [
  param("id").isMongoId().withMessage("Valid payment ID is required."),
  validateRequest,
];

