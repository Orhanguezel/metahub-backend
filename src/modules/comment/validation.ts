import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import {
  ALLOWED_COMMENT_CONTENT_TYPES,
  ALLOWED_COMMENT_CONTENT_TYPES_LOWER,
  ALLOWED_COMMENT_TYPES,
} from "@/core/utils/constants";
import { SUPPORTED_LOCALES } from "@/types/common";

/* --- Guest için zorunluluk + create payload --- */
export const validateCreateComment = [
  body("name")
    .if((_, { req }) => !req.user)
    .trim()
    .notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters."),

  body("email")
    .if((_, { req }) => !req.user)
    .trim()
    .isEmail().withMessage("A valid email address is required.")
    .normalizeEmail(),

  // En az bir metin alanı zorunlu
  body().custom((body) => {
    if (!body.text && !body.comment && !body.label) {
      throw new Error("At least one of text, comment or label must be provided.");
    }
    return true;
  }),

  // label/text/comment validasyonları
  body("label").optional().isString().isLength({ min: 2, max: 150 }).withMessage("Label must be between 2 and 150 characters."),
  body("text").optional().isString().isLength({ min: 5, max: 500 }).withMessage("Text must be between 5 and 500 characters."),
  body("comment").optional().isString().isLength({ min: 5, max: 500 }).withMessage("Comment must be between 5 and 500 characters."),

  // contentType enum
  body("contentType")
    .notEmpty().withMessage("Content type is required.")
    .isString()
    .custom((value) => {
      const lower = String(value).toLowerCase();
      if (!ALLOWED_COMMENT_CONTENT_TYPES_LOWER.has(lower)) {
        throw new Error(`Content type must be one of: ${ALLOWED_COMMENT_CONTENT_TYPES.join(", ")}`);
      }
      return true;
    }),

  // type enum (opsiyonel)
  body("type")
    .optional()
    .isString()
    .custom((value) => {
      const lower = String(value).toLowerCase();
      if (!ALLOWED_COMMENT_TYPES.includes(lower as any)) {
        throw new Error(`Type must be one of: ${ALLOWED_COMMENT_TYPES.join(", ")}`);
      }
      return true;
    }),

  // rating (opsiyonel)
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be a number between 1 and 5."),

  // contentId (testimonial dışı zorunlu)
  body("contentId")
    .if(body("type").not().equals("testimonial"))
    .notEmpty().withMessage("Content ID is required.")
    .isMongoId().withMessage("Content ID must be a valid MongoDB ObjectId."),

  validateRequest,
];

/* --- Admin reply payload --- */
export const validateReplyToComment = [
  param("id").isMongoId().withMessage("Invalid comment ID."),
  ...SUPPORTED_LOCALES.map((lng) =>
    body(`text.${lng}`)
      .optional()
      .isString()
      .withMessage(`${lng.toUpperCase()} reply must be a string.`)
  ),
  validateRequest,
];

/* --- Yorumun kendi id'si (comment id) --- */
export const validateCommentIdParam = [
  param("id").isMongoId().withMessage("Comment ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

/* --- İçerik id param (content id) --- */
export const validateContentIdParam = [
  param("id").isMongoId().withMessage("Content ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

/* --- Public testimonials query --- */
export const validateListTestimonials = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be 1..100"),
  query("minRating").optional().isInt({ min: 1, max: 5 }).withMessage("minRating must be 1..5"),
  validateRequest,
];
