import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Yeni ödeme oluşturma validasyonu
export const validatePaymentCreate = [
  body("order")
    .notEmpty()
    .withMessage("payment.validation.order_required") // i18n anahtarı olarak
    .isMongoId()
    .withMessage("payment.validation.order_mongoid"),

  body("amount")
    .notEmpty()
    .withMessage("payment.validation.amount_required")
    .isNumeric()
    .withMessage("payment.validation.amount_number")
    .isFloat({ min: 0.01 })
    .withMessage("payment.validation.amount_min"),

  body("method")
    .notEmpty()
    .withMessage("payment.validation.method_required")
    .isIn(["cash_on_delivery", "credit_card", "paypal"])
    .withMessage("payment.validation.method_invalid"),

  validateRequest,
];

// ✅ Ödeme metodunu güncelleme validasyonu
export const validatePaymentUpdateMethod = [
  param("id")
    .notEmpty()
    .withMessage("payment.validation.id_required")
    .isMongoId()
    .withMessage("payment.validation.id_invalid"),

  body("method")
    .notEmpty()
    .withMessage("payment.validation.method_required")
    .isIn(["cash_on_delivery", "credit_card", "paypal"])
    .withMessage("payment.validation.method_invalid"),

  validateRequest,
];

// ✅ Ödeme ID'si validasyonu
export const validatePaymentIdParam = [
  param("paymentId").isMongoId().withMessage("payment.validation.id_invalid"),
  validateRequest,
];
