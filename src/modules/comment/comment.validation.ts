import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreateComment = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters."),
  body("email")
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
    .isIn(["blog", "product", "service"])
    .withMessage("Content type must be blog, product, or service."),
  body("contentId")
    .notEmpty()
    .withMessage("Content ID is required.")
    .isMongoId()
    .withMessage("Content ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

export const validateCommentIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Comment ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

export const validateContentIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Content ID must be a valid MongoDB ObjectId."),
  validateRequest,
];
