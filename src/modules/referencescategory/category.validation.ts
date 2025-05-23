import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🔍 ID parametresi için ObjectId doğrulaması
export const validateObjectIdParam = [
  param("id").isMongoId().withMessage("Invalid MongoDB ObjectId."),
  validateRequest,
];

// ➕ Kategori oluşturma doğrulaması (çok dilli description kontrolü)
export const validateCreateReferenceCategory = [
  body("name.tr").notEmpty().withMessage("Name (TR) is required."),
  body("name.en").notEmpty().withMessage("Name (EN) is required."),
  body("name.de").notEmpty().withMessage("Name (DE) is required."),
  body("description.tr").optional().isString().withMessage("Description (TR) must be a string."),
  body("description.en").optional().isString().withMessage("Description (EN) must be a string."),
  body("description.de").optional().isString().withMessage("Description (DE) must be a string."),
  validateRequest,
];

// ✏️ Kategori güncelleme doğrulaması (çok dilli description kontrolü)
export const validateUpdateReferenceCategory = [
  body("name.tr").optional().isString().withMessage("Name (TR) must be a string."),
  body("name.en").optional().isString().withMessage("Name (EN) must be a string."),
  body("name.de").optional().isString().withMessage("Name (DE) must be a string."),
  body("description.tr").optional().isString().withMessage("Description (TR) must be a string."),
  body("description.en").optional().isString().withMessage("Description (EN) must be a string."),
  body("description.de").optional().isString().withMessage("Description (DE) must be a string."),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean."),
  validateRequest,
];
