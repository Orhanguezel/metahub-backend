// users.me.validation.ts (veya mevcut dosyan)
import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

// ortak i18n helper (express-validator withMessage için)
const msg =
  (key: string, vars?: Record<string, any>) =>
  (_value: any, { req }: { req: any }) =>
    translate(
      key,
      (req?.locale as SupportedLocale) || getLogLocale(),
      translations,
      vars
    );

/* ----------------------------- AUTH: REGISTER ----------------------------- */
export const validateRegister = [
  body("name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage(msg("validation.name.required")),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage(msg("validation.email.required")),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage(msg("validation.password.min", { min: 6 })),
  validateRequest,
];

/* ------------------------------- AUTH: LOGIN ------------------------------ */
export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage(msg("validation.email.required")),
  body("password").notEmpty().withMessage(msg("validation.password.required")),
  validateRequest,
];

/* ------------------------------ PARAM: USER ID ---------------------------- */
export const validateUserId = [
  param("id").isMongoId().withMessage(msg("validation.userId.invalid")),
  validateRequest,
];

/* ----------------------------- ME: UPDATE PROFILE ------------------------- */
export const validateUpdateMyProfile = [
  body("name").optional().isString().withMessage(msg("validation.name.string")),
  body("email").optional().isEmail().withMessage(msg("validation.email.valid")),
  body("phone").optional().isString().withMessage(msg("validation.phone.string")),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage(
      msg("validation.language.enum", { list: SUPPORTED_LOCALES.join(", ") })
    ),
  validateRequest,
];

/* ---------------------------- ME: UPDATE PASSWORD ------------------------- */
export const validateUpdateMyPassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage(msg("validation.currentPassword.required")),
  body("newPassword")
    .isString()
    .isLength({ min: 6 })
    .withMessage(msg("validation.newPassword.min", { min: 6 })),
  validateRequest,
];

/* ------------------------ ME: NOTIFICATION SETTINGS ----------------------- */
export const validateUpdateNotificationSettings = [
  body("emailNotifications")
    .optional()
    .isBoolean()
    .withMessage(msg("validation.emailNotifications.boolean")),
  body("smsNotifications")
    .optional()
    .isBoolean()
    .withMessage(msg("validation.smsNotifications.boolean")),
  validateRequest,
];

/* ----------------------------- ME: SOCIAL LINKS --------------------------- */
export const validateUpdateSocialLinks = [
  body("facebook")
    .optional()
    .isString()
    .withMessage(msg("validation.facebook.string")),
  body("instagram")
    .optional()
    .isString()
    .withMessage(msg("validation.instagram.string")),
  body("twitter")
    .optional()
    .isString()
    .withMessage(msg("validation.twitter.string")),
  // body("linkedin").optional().isString().withMessage(msg("validation.linkedin.string")),
  validateRequest,
];
