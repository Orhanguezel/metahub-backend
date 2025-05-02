import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🎯 Yorum oluşturma validasyonu
export const validateCreateReview = [
  body("productId")
    .notEmpty().withMessage("Product ID is required.")
    .isMongoId().withMessage("Product ID must be a valid Mongo ID."),
  body("rating")
    .notEmpty().withMessage("Rating is required.")
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5."),
  body("comment")
    .notEmpty().withMessage("Comment is required.")
    .isString().withMessage("Comment must be a string."),
  validateRequest,
];

// 🎯 Yorum güncelleme validasyonu
export const validateUpdateReview = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5."),
  body("comment")
    .optional()
    .isString().withMessage("Comment must be a string."),
  validateRequest,
];

// 🎯 Param ID kontrolü
export const validateObjectIdParam = (field: string) => [
  param(field)
    .notEmpty().withMessage(`${field} param is required.`)
    .isMongoId().withMessage(`${field} must be a valid Mongo ID.`),
  validateRequest,
];
