import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Skill oluşturma validasyonu
export const validateCreateSkill = [
  body("category.tr").notEmpty().withMessage("Category (TR) is required."),
  body("category.en").notEmpty().withMessage("Category (EN) is required."),
  body("category.de").notEmpty().withMessage("Category (DE) is required."),
  body("name.tr").notEmpty().withMessage("Name (TR) is required."),
  body("name.en").notEmpty().withMessage("Name (EN) is required."),
  body("name.de").notEmpty().withMessage("Name (DE) is required."),
  body("image").notEmpty().withMessage("Image URL is required."),
  validateRequest,
];

// ✅ Skill güncelleme validasyonu
export const validateUpdateSkill = [
  body("category").optional().isObject().withMessage("Category must be an object."),
  body("name").optional().isObject().withMessage("Name must be an object."),
  body("image").optional().isString().withMessage("Image must be a string."),
  validateRequest,
];

// ✅ Param id validasyonu
export const validateSkillId = [
  param("id").isMongoId().withMessage("Invalid skill ID."),
  validateRequest,
];
