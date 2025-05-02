import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Slug param doğrulama
export const validateSlugParam = [
  param("slug").isString().trim().notEmpty().withMessage("Slug parameter is required."),
  validateRequest,
];

// ✅ ID param doğrulama
export const validateIdParam = [
  param("id").isMongoId().withMessage("ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

// ✅ Create Reference doğrulama
export const validateCreateReference = [
  body("companyName.tr").notEmpty().withMessage("Company name (TR) is required."),
  body("companyName.en").notEmpty().withMessage("Company name (EN) is required."),
  body("companyName.de").notEmpty().withMessage("Company name (DE) is required."),
  body("sector.tr").notEmpty().withMessage("Sector (TR) is required."),
  body("sector.en").notEmpty().withMessage("Sector (EN) is required."),
  body("sector.de").notEmpty().withMessage("Sector (DE) is required."),
  validateRequest,
];

// ✅ Update Reference doğrulama
export const validateUpdateReference = [
  body("companyName").optional().isObject().withMessage("Company name must be an object."),
  body("sector").optional().isObject().withMessage("Sector must be an object."),
  body("description").optional().isObject().withMessage("Description must be an object."),
  body("tags").optional().isArray().withMessage("Tags must be an array."),
  body("isPublished").optional().isBoolean().withMessage("isPublished must be true or false."),
  validateRequest,
];
