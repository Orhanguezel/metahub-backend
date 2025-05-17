import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { isValidObjectId } from "@/core/utils/validation";

export const validateUploadGallery = [
  body("category").isString().notEmpty().withMessage("Category is required."),
  body("type").optional().isIn(["image", "video"]).withMessage("Invalid type."),

  body("title_tr").optional().custom((v) => Array.isArray(v) || typeof v === "string"),
  body("title_en").optional().custom((v) => Array.isArray(v) || typeof v === "string"),
  body("title_de").optional().custom((v) => Array.isArray(v) || typeof v === "string"),
  body("desc_tr").optional().custom((v) => Array.isArray(v) || typeof v === "string"),
  body("desc_en").optional().custom((v) => Array.isArray(v) || typeof v === "string"),
  body("desc_de").optional().custom((v) => Array.isArray(v) || typeof v === "string"),

  body("order").optional().custom((v) => {
    if (Array.isArray(v)) return v.every((el) => !isNaN(Number(el)));
    return !isNaN(Number(v));
  }).withMessage("Order must be a number or array of numbers."),

  validateRequest,
];


export const validateGalleryIdParam = [
  param("id")
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid gallery ID."),
  validateRequest,
];
