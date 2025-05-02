import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Create Library Item Validator
export const validateCreateLibrary = [
  body("category").optional().isString().withMessage("Category must be a string."),
  body("fileType")
    .optional()
    .isIn(["pdf", "docx", "pptx", "image", "other"])
    .withMessage("Invalid file type."),
  body("tags").optional().isArray().withMessage("Tags must be an array."),
  validateRequest,
];

// ✅ ID Param Validator
export const validateLibraryIdParam = [
  param("id").isMongoId().withMessage("Invalid library item ID."),
  validateRequest,
];
