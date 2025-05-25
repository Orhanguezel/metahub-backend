// src/modules/users/users.advanced.validation.ts
import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// E-Mail Verification
export const validateSendEmailVerification = [
  body("email")
    .trim()
    .isEmail().withMessage("Valid email is required.")
    .normalizeEmail(),
  validateRequest,
];

export const validateVerifyEmail = [
  body("token")
    .isString().withMessage("Token must be string.")
    .notEmpty().withMessage("Token is required."),
  validateRequest,
];

// OTP
export const validateSendOtp = [
  body("email")
    .trim()
    .isEmail().withMessage("Valid email is required.")
    .normalizeEmail(),
  validateRequest,
];

export const validateVerifyOtp = [
  body("email")
    .trim()
    .isEmail().withMessage("Valid email is required.")
    .normalizeEmail(),
  body("code")
    .isString().withMessage("OTP code must be string.")
    .notEmpty().withMessage("OTP code is required."),
  validateRequest,
];

export const validateResendOtp = [
  body("email")
    .trim()
    .isEmail().withMessage("Valid email is required.")
    .normalizeEmail(),
  validateRequest,
];

// MFA (future use, örnek alanlar)
export const validateEnableMfa = [
  // body("mfaSecret").optional().isString().withMessage("MFA secret must be string."),
  validateRequest,
];

export const validateVerifyMfa = [
  // body("mfaCode").optional().isString().withMessage("MFA code must be string."),
  validateRequest,
];
