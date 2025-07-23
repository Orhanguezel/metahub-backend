import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import {
  ALLOWED_COMMENT_CONTENT_TYPES,
  ALLOWED_COMMENT_CONTENT_TYPES_LOWER,
  ALLOWED_COMMENT_TYPES,
} from "@/core/utils/constants";
import { SUPPORTED_LOCALES } from "@/types/common";

// --- Guest için zorunluluk
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

  // --- En az bir metin alanı zorunlu (text, comment, label) ---
  body().custom((body) => {
    if (
      !body.text &&
      !body.comment &&
      !body.label
    ) {
      throw new Error("At least one of text, comment or label must be provided.");
    }
    return true;
  }),

  // label/text/comment field’lar için standart validasyon
  body("label").optional().isString().isLength({ min: 2, max: 150 }).withMessage("Label must be between 2 and 150 characters."),
  body("text").optional().isString().isLength({ min: 5, max: 500 }).withMessage("Text must be between 5 and 500 characters."),
  body("comment").optional().isString().isLength({ min: 5, max: 500 }).withMessage("Comment must be between 5 and 500 characters."),

  // --- contentType: enum kontrolü
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

  // --- type alanı: enum kontrolü (opsiyonel)
  body("type")
    .optional()
    .isString()
    .custom((value) => {
      const lower = String(value).toLowerCase();
      if (!ALLOWED_COMMENT_TYPES.includes(lower as any)) {
        throw new Error(
          `Type must be one of: ${ALLOWED_COMMENT_TYPES.join(", ")}`
        );
      }
      return true;
    }),

  // --- rating (opsiyonel, sadece review/rating tipinde zorlanır)
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be a number between 1 and 5."),

  // --- contentId: zorunlu ObjectId
  body("contentId")
    .notEmpty().withMessage("Content ID is required.")
    .isMongoId().withMessage("Content ID must be a valid MongoDB ObjectId."),

  validateRequest,
];

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

// Yorumun kendi id'si (comment id)
export const validateCommentIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Comment ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

// Bir içeriğe ait yorumları çekerken kullanılan içerik id'si (content id)
export const validateContentIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Content ID must be a valid MongoDB ObjectId."),
  validateRequest,
];
