import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Validate sendTestEmail body
export const validateSendTestEmail = [
  body("to")
    .isEmail()
    .withMessage("A valid recipient email (to) is required."),
  body("subject")
    .isString()
    .notEmpty()
    .withMessage("Subject is required."),
  body("message")
    .isString()
    .notEmpty()
    .withMessage("Message body is required."),
  validateRequest,
];

// ✅ Validate markAsReadOrUnread
export const validateMarkAsReadOrUnread = [
  param("id")
    .isMongoId()
    .withMessage("Mail ID must be a valid MongoDB ObjectId."),
  body("isRead")
    .isBoolean()
    .withMessage("isRead must be a boolean value."),
  validateRequest,
];
