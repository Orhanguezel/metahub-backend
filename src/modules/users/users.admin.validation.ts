import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🔐 Register validation
export const validateRegister = [
  body("name").isString().notEmpty().withMessage("Name is required."),
  body("email").isEmail().withMessage("Valid email is required."),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
  body("role")
    .optional()
    .isIn(["admin", "user", "customer", "moderator", "staff"])
    .withMessage("Invalid role."),
  validateRequest,
];

// 🔐 Login validation
export const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
  validateRequest,
];

// 🔑 Change password validation
export const validateChangePassword = [
  body("currentPassword")
    .isString()
    .notEmpty()
    .withMessage("Current password is required."),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters."),
  validateRequest,
];

// 🔑 Forgot password validation
export const validateForgotPassword = [
  body("email").isEmail().withMessage("Valid email is required."),
  validateRequest,
];

// 🔑 Reset password validation
export const validateResetPassword = [
  param("token").isString().notEmpty().withMessage("Reset token is required."),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters."),
  validateRequest,
];

// 🆔 User ID param validation
export const validateUserIdParam = [
  param("id").isMongoId().withMessage("Invalid user ID."),
  validateRequest,
];

// 🛠️ Update user validation (admin)
export const validateUpdateUser = [
  body("name").optional().isString(),
  body("email").optional().isEmail().withMessage("Email must be valid."),
  body("role")
    .optional()
    .isIn(["admin", "user", "customer", "moderator", "staff"])
    .withMessage("Invalid role."),
  body("isActive").optional().isBoolean(),
  body("phone").optional().isString(),
  body("bio").optional().isString(),
  body("birthDate").optional().isISO8601().toDate(),
  validateRequest,
];

// 🛠️ Update role validation
export const validateUpdateUserRole = [
  param("id").isMongoId().withMessage("Invalid user ID."),
  body("role")
    .notEmpty()
    .isIn(["admin", "user", "customer", "moderator", "staff"])
    .withMessage("Invalid role."),
  validateRequest,
];

// 🛠️ Update status validation
export const validateToggleUserStatus = [
  param("id").isMongoId().withMessage("Invalid user ID."),
  body("isActive").isBoolean().withMessage("isActive must be boolean."),
  validateRequest,
];
