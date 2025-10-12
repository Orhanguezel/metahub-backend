// src/modules/users/authlite/authlite.validation.ts

import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "../i18n";
import { validateEmailFormat } from "@/core/middleware/auth/validation";

const T = (req: any, key: string, fallback: string) =>
  ((): string => {
    const v = translate(key, req?.locale || getLogLocale() || "tr", translations);
    return !v || v === key ? fallback : v;
  })();

export const validateRegisterEmail = [
  body("email")
    .exists({ checkFalsy: true })
    .custom((v, { req }) => {
      if (!validateEmailFormat(v || "")) throw new Error(T(req, "auth.invalidEmail", "Geçersiz e-posta."));
      return true;
    }),
  body("password")
    .exists({ checkFalsy: true })
    .isString()
    .isLength({ min: 8 })
    .withMessage((_, { req }) => T(req, "auth.weakPassword", "Şifre en az 8 karakter olmalı.")),
  body("name").optional().isString(),
  validateRequest,
];

export const validateLoginEmail = [
  body("email")
    .exists({ checkFalsy: true })
    .custom((v, { req }) => {
      if (!validateEmailFormat(v || "")) throw new Error(T(req, "auth.invalidEmail", "Geçersiz e-posta."));
      return true;
    }),
  body("password")
    .exists({ checkFalsy: true })
    .withMessage((_, { req }) => T(req, "auth.passwordRequired", "Şifre zorunlu.")),
  validateRequest,
];

export const validateGoogle = [
  body("idToken")
    .exists({ checkFalsy: true })
    .withMessage((_, { req }) =>
      T(req, "auth.googleMissingToken", "Google kimlik doğrulaması yapılandırılmamış.")
    ),
  validateRequest,
];

export const validateFacebook = [
  body("accessToken")
    .exists({ checkFalsy: true })
    .withMessage((_, { req }) =>
      T(req, "auth.facebookMissingToken", "Facebook kimlik doğrulaması yapılandırılmamış.")
    ),
  validateRequest,
];

export const validateForgotPassword = [
  body("email")
    .exists({ checkFalsy: true })
    .custom((v, { req }) => {
      if (!validateEmailFormat(v || "")) throw new Error(T(req, "auth.invalidEmail", "Geçersiz e-posta."));
      return true;
    }),
  validateRequest,
];

export const validateResetPassword = [
  body("email")
    .exists({ checkFalsy: true })
    .custom((v, { req }) => {
      if (!validateEmailFormat(v || "")) throw new Error(T(req, "auth.invalidEmail", "Geçersiz e-posta."));
      return true;
    }),
  body("newPassword")
    .exists({ checkFalsy: true })
    .isLength({ min: 8 })
    .withMessage((_, { req }) => T(req, "auth.weakPassword", "Şifre en az 8 karakter olmalı.")),
  body("code").optional({ checkFalsy: true }).isString(),
  body("token").optional({ checkFalsy: true }).isString(),
  body().custom((_, { req }) => {
    const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
    const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
    if (!code && !token) {
      throw new Error(T(req, "auth.codeOrTokenRequired", "Kod veya token zorunludur."));
    }
    return true;
  }),
  validateRequest,
];


export const validateChangePassword = [
  body("currentPassword").exists({ checkFalsy: true }).isString(),
  body("newPassword")
    .exists({ checkFalsy: true })
    .isLength({ min: 8 })
    .withMessage((_, { req }) => T(req, "auth.weakPassword", "Şifre en az 8 karakter olmalı.")),
  validateRequest,
];

export const validateChangeEmailStart = [
  body("currentPassword").exists({ checkFalsy: true }).isString(),
  body("newEmail")
    .exists({ checkFalsy: true })
    .custom((v, { req }) => {
      if (!validateEmailFormat(v || "")) throw new Error(T(req, "auth.invalidEmail", "Geçersiz e-posta."));
      return true;
    }),
  validateRequest,
];

export const validateChangeEmailConfirm = [
  body("newEmail")
    .exists({ checkFalsy: true })
    .custom((v, { req }) => {
      if (!validateEmailFormat(v || "")) throw new Error(T(req, "auth.invalidEmail", "Geçersiz e-posta."));
      return true;
    }),
  body("code").optional({ checkFalsy: true }).isString(),
  body("token").optional({ checkFalsy: true }).isString(),
  body().custom((_, { req }) => {
    const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
    const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
    if (!code && !token) {
      throw new Error(T(req, "auth.codeOrTokenRequired", "Kod veya token zorunludur."));
    }
    return true;
  }),
  validateRequest,
];
