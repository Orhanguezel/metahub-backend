import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Sport oluşturma validasyonu
export const validateCreateSport = [
  body("label.tr").notEmpty().withMessage("Label (TR) is required."),
  body("label.en").notEmpty().withMessage("Label (EN) is required."),
  body("label.de").notEmpty().withMessage("Label (DE) is required."),
  body("description").optional().isObject().withMessage("Description must be an object."),
  body("category").optional().isString().withMessage("Category must be a string."),
  validateRequest,
];

// ✅ Sport güncelleme validasyonu
export const validateUpdateSport = [
  body("label").optional().isObject().withMessage("Label must be an object."),
  body("description").optional().isObject().withMessage("Description must be an object."),
  body("category").optional().isString().withMessage("Category must be a string."),
  body("removedImages").optional().isArray().withMessage("removedImages must be an array."),
  validateRequest,
];

// ✅ ID param validasyonu
export const validateSportId = [
  param("id").isMongoId().withMessage("Invalid sport ID."),
  validateRequest,
];
