// src/modules/users/advanced/users.advanced.validation.ts
import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "../i18n";

// i18n helper for express-validator messages
const msg =
  (key: string, vars?: Record<string, any>) =>
  (_value: any, { req }: { req: any }) =>
    translate(
      key,
      (req?.locale as SupportedLocale) || getLogLocale(),
      translations,
      vars
    );

/* --------------------------- E-Mail Verification -------------------------- */
export const validateSendEmailVerification = [
  body("email")
    .trim()
    .isEmail()
    .withMessage(msg("validation.email.required"))
    .normalizeEmail(),
  validateRequest,
];

export const validateVerifyEmail = [
  body("token")
    .isString()
    .withMessage(msg("validation.token.string"))
    .notEmpty()
    .withMessage(msg("validation.token.required")),
  validateRequest,
];

/* ------------------------------------ OTP --------------------------------- */
export const validateSendOtp = [
  body("email")
    .trim()
    .isEmail()
    .withMessage(msg("validation.email.required"))
    .normalizeEmail(),
  validateRequest,
];

export const validateVerifyOtp = [
  body("email")
    .trim()
    .isEmail()
    .withMessage(msg("validation.email.required"))
    .normalizeEmail(),
  body("code")
    .isString()
    .withMessage(msg("validation.otp.string"))
    .notEmpty()
    .withMessage(msg("validation.otp.required")),
  validateRequest,
];

export const validateResendOtp = [
  body("email")
    .trim()
    .isEmail()
    .withMessage(msg("validation.email.required"))
    .normalizeEmail(),
  validateRequest,
];

/* ------------------------------------ MFA --------------------------------- */
export const validateEnableMfa = [
  // body("mfaSecret")
  //   .optional()
  //   .isString()
  //   .withMessage(msg("validation.mfa.secret.string")),
  validateRequest,
];

export const validateVerifyMfa = [
  // body("mfaCode")
  //   .optional()
  //   .isString()
  //   .withMessage(msg("validation.mfa.code.string")),
  validateRequest,
];
