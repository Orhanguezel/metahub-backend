import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { ALLOWED_COMMENT_CONTENT_TYPES } from "@/core/utils/constants";

// 🎯 Mesajlarda kullanmak için string
const allowedTypesText = ALLOWED_COMMENT_CONTENT_TYPES.join(", ");

// 🎯 Set ile lowercase kıyaslama
const allowedSet = new Set(
  ALLOWED_COMMENT_CONTENT_TYPES.map((t) => t.toLowerCase())
);

// ✅ Yorum Oluşturma Validasyonu
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

  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment is required.")
    .isLength({ min: 5, max: 500 })
    .withMessage("Comment must be between 5 and 500 characters."),

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

  body("contentId")
    .notEmpty()
    .withMessage("Content ID is required.")
    .isMongoId()
    .withMessage("Content ID must be a valid MongoDB ObjectId."),

  validateRequest,
];

// ✅ Yorum ID Parametresi Kontrolü
export const validateCommentIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Comment ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

// ✅ İçerik ID Parametresi Kontrolü
export const validateContentIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Content ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

// ✅ Admin Reply Validasyonu
export const validateReplyToComment = [
  param("id").isMongoId().withMessage("Invalid comment ID."),
  body("text.tr")
    .optional()
    .isString()
    .withMessage("TR reply must be a string."),
  body("text.en")
    .optional()
    .isString()
    .withMessage("EN reply must be a string."),
  body("text.de")
    .optional()
    .isString()
    .withMessage("DE reply must be a string."),
  validateRequest,
];
