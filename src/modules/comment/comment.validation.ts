import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { ALLOWED_COMMENT_CONTENT_TYPES } from "@/core/utils/constants";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🎯 Mesajlarda kullanmak için string
const allowedTypesText = ALLOWED_COMMENT_CONTENT_TYPES.join(", ");
const allowedSet = new Set(
  ALLOWED_COMMENT_CONTENT_TYPES.map((t) => t.toLowerCase())
);

// --- Sadece guest kullanıcı için name/email zorunlu
export const validateCreateComment = [
  body("name")
    .if((_, { req }) => !req.user)
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters."),

  body("email")
    .if((_, { req }) => !req.user)
    .trim()
    .isEmail()
    .withMessage("A valid email address is required.")
    .normalizeEmail(),

  // label zorunlu değil, çünkü formdan gelebilir/gelen adla aynı olabilir
  body("label")
    .optional()
    .isString()
    .withMessage("Label must be a string.")
    .isLength({ min: 2, max: 150 })
    .withMessage("Label must be between 2 and 150 characters."),

  // text (veya comment) zorunlu
  body("text")
    .optional()
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage("Comment text must be between 5 and 500 characters."),

  body("comment")
    .optional()
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage("Comment must be between 5 and 500 characters."),

  // contentType
  body("contentType")
    .notEmpty()
    .withMessage("Content type is required.")
    .custom((value) => {
      const lower = String(value).toLowerCase();
      if (!allowedSet.has(lower)) {
        throw new Error(`Content type must be one of: ${allowedTypesText}`);
      }
      return true;
    }),

  // contentId
  body("contentId")
    .notEmpty()
    .withMessage("Content ID is required.")
    .isMongoId()
    .withMessage("Content ID must be a valid MongoDB ObjectId."),

  validateRequest,
];

// --- ID param validasyonları
export const validateCommentIdParam = [
  param("id").isMongoId().withMessage("Comment ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

export const validateContentIdParam = [
  param("id").isMongoId().withMessage("Content ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

// --- Admin Reply validasyonu (dinamik, tüm diller)
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
