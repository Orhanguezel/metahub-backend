// src/modules/users/users.admin.validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

// i18n helper: express-validator withMessage için
const msg =
  (key: string, vars?: Record<string, any>) =>
  (_value: any, { req }: { req: any }) =>
    translate(
      key,
      (req?.locale as SupportedLocale) || getLogLocale(),
      translations,
      vars
    );

// Tek noktadan rol listesi (register/update için superadmin DAHİL DEĞİL)
const ROLES = ["admin", "user", "customer", "moderator", "staff"] as const;

/* ------------------------------ REGISTER ------------------------------ */
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
    .isLength({ min: 6 })
    .withMessage(msg("validation.password.min", { min: 6 })),
  body("role")
    .optional()
    .isIn(ROLES as unknown as string[])
    .withMessage(msg("validation.role.enum", { list: ROLES.join(", ") })),
  validateRequest,
];

/* ------------------------------- LOGIN -------------------------------- */
export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage(msg("validation.email.required")),
  body("password")
    .notEmpty()
    .withMessage(msg("validation.password.required")),
  validateRequest,
];

/* --------------------------- CHANGE PASSWORD --------------------------- */
export const validateChangePassword = [
  body("currentPassword")
    .isString()
    .notEmpty()
    .withMessage(msg("validation.currentPassword.required")),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage(msg("validation.newPassword.min", { min: 6 })),
  validateRequest,
];

/* --------------------------- FORGOT PASSWORD --------------------------- */
export const validateForgotPassword = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage(msg("validation.email.required")),
  validateRequest,
];

/* ---------------------------- RESET PASSWORD --------------------------- */
export const validateResetPassword = [
  param("token")
    .isString()
    .notEmpty()
    .withMessage(msg("validation.token.required")),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage(msg("validation.newPassword.min", { min: 6 })),
  validateRequest,
];

/* ------------------------------ USER ID -------------------------------- */
export const validateUserIdParam = [
  param("id").isMongoId().withMessage(msg("validation.userId.invalid")),
  validateRequest,
];

/* ----------------------------- UPDATE USER ----------------------------- */
export const validateUpdateUser = [
  body("name").optional().isString().withMessage(msg("validation.name.string")),
  body("email")
    .optional()
    .isEmail()
    .withMessage(msg("validation.email.valid")),
  body("role")
    .optional()
    .isIn(ROLES as unknown as string[])
    .withMessage(msg("validation.role.enum", { list: ROLES.join(", ") })),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage(msg("validation.isActive.boolean")),
  body("phone")
    .optional()
    .isString()
    .withMessage(msg("validation.phone.string")),
  body("bio")
    .optional()
    .isString()
    .withMessage(msg("validation.bio.string")),
  body("birthDate")
    .optional()
    .isISO8601()
    .withMessage(msg("validation.birthDate.iso"))
    .toDate(),
  validateRequest,
];

/* -------------------------- UPDATE USER ROLE --------------------------- */
export const validateUpdateUserRole = [
  param("id").isMongoId().withMessage(msg("validation.userId.invalid")),
  body("role")
    .notEmpty()
    .isIn(ROLES as unknown as string[])
    .withMessage(msg("validation.role.required")),
  validateRequest,
];

/* ------------------------- TOGGLE USER STATUS -------------------------- */
// Not: Controller'da zaten toggle yapıyorsan body.isActive gerekmeyebilir.
// Yine de mevcut davranışı korumak adına boolean doğrulamasını bıraktım.
export const validateToggleUserStatus = [
  param("id").isMongoId().withMessage(msg("validation.userId.invalid")),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage(msg("validation.isActive.boolean")),
  validateRequest,
];
