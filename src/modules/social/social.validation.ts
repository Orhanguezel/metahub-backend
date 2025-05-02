import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Social media oluşturma validasyonu
export const validateCreateSocialLink = [
  body("platform.tr").notEmpty().withMessage("Platform (TR) is required."),
  body("platform.en").notEmpty().withMessage("Platform (EN) is required."),
  body("platform.de").notEmpty().withMessage("Platform (DE) is required."),
  body("link").notEmpty().isURL().withMessage("Link must be a valid URL."),
  body("icon").optional().isString().withMessage("Icon must be a string."),
  validateRequest,
];

// ✅ Social media güncelleme validasyonu
export const validateUpdateSocialLink = [
  body("platform").optional().isObject().withMessage("Platform must be an object."),
  body("link").optional().isURL().withMessage("Link must be a valid URL."),
  body("icon").optional().isString().withMessage("Icon must be a string."),
  validateRequest,
];

// ✅ Param id validasyonu
export const validateSocialId = [
  param("id").isMongoId().withMessage("Invalid social media ID."),
  validateRequest,
];
