import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔐 Register validation
export const validateRegister = [
  body("name").isString().notEmpty().withMessage("Name is required."),
  body("email").isEmail().withMessage("Valid email is required."),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
  validateRequest,
];

// 🔐 Login validation
export const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
  validateRequest,
];

// ✅ User ID param check
export const validateUserId = [
  param("id").isMongoId().withMessage("Invalid user ID."),
  validateRequest,
];

// ✏️ Update my profile (me/update)
export const validateUpdateMyProfile = [
  body("name").optional().isString().withMessage("Name must be a string."),
  body("email").optional().isEmail().withMessage("Email must be valid."),
  body("phone").optional().isString().withMessage("Phone must be a string."),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(
      `Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`
    ),
  validateRequest,
];

// 🔑 Update my password (me/password)
export const validateUpdateMyPassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required."),
  body("newPassword")
    .isString()
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters."),
  validateRequest,
];

// 🔔 Update notification settings (me/notifications)
export const validateUpdateNotificationSettings = [
  body("emailNotifications")
    .optional()
    .isBoolean()
    .withMessage("emailNotifications must be a boolean."),
  body("smsNotifications")
    .optional()
    .isBoolean()
    .withMessage("smsNotifications must be a boolean."),
  validateRequest,
];

// 🌐 Update social links (me/social)
export const validateUpdateSocialLinks = [
  body("facebook")
    .optional()
    .isString()
    .withMessage("Facebook must be a string."),
  body("instagram")
    .optional()
    .isString()
    .withMessage("Instagram must be a string."),
  body("twitter")
    .optional()
    .isString()
    .withMessage("Twitter must be a string."),
  // Yeni sosyal medya platformu eklemek için buraya ekle:
  // body("linkedin").optional().isString().withMessage("LinkedIn must be a string."),
  validateRequest,
];
