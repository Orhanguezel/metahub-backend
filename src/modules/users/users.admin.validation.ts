import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

const msg =
  (key: string, vars?: Record<string, any>) =>
  (_value: any, { req }: { req: any }) =>
    translate((key as string), (req?.locale as SupportedLocale) || getLogLocale(), translations, vars);

const ROLES = ["admin", "user", "customer", "moderator", "staff"] as const;

/* ------------------------------ REGISTER ------------------------------ */
export const validateRegister = [
  body("name").isString().trim().notEmpty().withMessage(msg("validation.name.required")),
  body("email").isEmail().normalizeEmail().withMessage(msg("validation.email.required")),
  body("password").isLength({ min: 8 }).withMessage(msg("validation.password.min", { min: 8 })), // <- 8
  body("role").optional().isIn(ROLES as unknown as string[]).withMessage(msg("validation.role.enum", { list: ROLES.join(", ") })),
  validateRequest,
];

/* ------------------------------- LOGIN -------------------------------- */
export const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage(msg("validation.email.required")),
  body("password").notEmpty().withMessage(msg("validation.password.required")),
  validateRequest,
];

/* --------------------------- CHANGE PASSWORD --------------------------- */
export const validateChangePassword = [
  body("currentPassword").isString().notEmpty().withMessage(msg("validation.currentPassword.required")),
  body("newPassword").isLength({ min: 8 }).withMessage(msg("validation.newPassword.min", { min: 8 })), // <- 8
  validateRequest,
];

/* --------------------------- FORGOT PASSWORD --------------------------- */
export const validateForgotPassword = [
  body("email").isEmail().normalizeEmail().withMessage(msg("validation.email.required")),
  validateRequest,
];

/* ---------------------------- RESET PASSWORD --------------------------- */
export const validateResetPassword = [
  param("token").isString().notEmpty().withMessage(msg("validation.token.required")),
  body("newPassword").isLength({ min: 8 }).withMessage(msg("validation.newPassword.min", { min: 8 })), // <- 8
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
  body("email").optional().isEmail().withMessage(msg("validation.email.valid")),
  body("role").optional().isIn(ROLES as unknown as string[]).withMessage(msg("validation.role.enum", { list: ROLES.join(", ") })),
  body("isActive").optional().isBoolean().withMessage(msg("validation.isActive.boolean")),
  body("phone").optional().isString().withMessage(msg("validation.phone.string")),
  body("bio").optional().isString().withMessage(msg("validation.bio.string")),
  body("birthDate").optional().isISO8601().withMessage(msg("validation.birthDate.iso")).toDate(),
  validateRequest,
];

/* -------------------------- UPDATE USER ROLE --------------------------- */
export const validateUpdateUserRole = [
  param("id").isMongoId().withMessage(msg("validation.userId.invalid")),
  body("role").notEmpty().isIn(ROLES as unknown as string[]).withMessage(msg("validation.role.required")),
  validateRequest,
];

/* ------------------------- TOGGLE USER STATUS -------------------------- */
export const validateToggleUserStatus = [
  param("id").isMongoId().withMessage(msg("validation.userId.invalid")),
  body("isActive").optional().isBoolean().withMessage(msg("validation.isActive.boolean")),
  validateRequest,
];
