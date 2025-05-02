import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Upload validator (opsiyonel)
export const validateUploadGallery = [
  body("type").optional().isIn(["image", "video"]).withMessage("Type must be 'image' or 'video'."),
  validateRequest,
];

// ✅ Param validator
export const validateGalleryIdParam = [
  param("id").isMongoId().withMessage("Invalid gallery item ID."),
  validateRequest,
];
