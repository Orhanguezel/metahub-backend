import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateSendMessage = [
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

  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Subject must be between 3 and 100 characters."),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required.")
    .isLength({ min: 5, max: 1000 })
    .withMessage("Message must be between 5 and 1000 characters."),

  validateRequest,
];

export const validateContactIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Message ID must be a valid MongoDB ObjectId."),
  validateRequest,
];
