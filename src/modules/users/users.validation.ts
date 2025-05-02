import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🔐 Register validasyonu
export const validateRegister = [
  body("name").isString().notEmpty().withMessage("Name is required."),
  body("email").isEmail().withMessage("Valid email is required."),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
  validateRequest,
];

// 🔐 Login validasyonu
export const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
  validateRequest,
];

// ✅ User ID parametre kontrolü
export const validateUserId = [
  param("id").isMongoId().withMessage("Invalid user ID."),
  validateRequest,
];

// ✏️ Profil güncelleme validasyonu (me/update)
export const validateUpdateMyProfile = [
  body("name").optional().isString().withMessage("Name must be a string."),
  body("email").optional().isEmail().withMessage("Email must be valid."),
  body("phone").optional().isString().withMessage("Phone must be a string."),
  body("language")
    .optional()
    .isIn(["tr", "en", "de"])
    .withMessage("Language must be 'tr', 'en', or 'de'."),
  validateRequest,
];

// 🔑 Şifre güncelleme validasyonu (me/password)
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

// 🔔 Bildirim tercihleri validasyonu (me/notifications)
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

// 🌐 Sosyal medya validasyonu (me/social)
export const validateUpdateSocialLinks = [
  body("facebook").optional().isString().withMessage("Facebook must be a string."),
  body("instagram").optional().isString().withMessage("Instagram must be a string."),
  body("twitter").optional().isString().withMessage("Twitter must be a string."),
  validateRequest,
];

// 📦 Adresler validasyonu (me/addresses)
export const validateUpdateAddresses = [
  body("addresses")
    .isArray({ min: 1 })
    .withMessage("Addresses must be an array with at least 1 item."),
  validateRequest,
];
