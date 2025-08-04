import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

// 1️⃣ Newsletter abone olma validasyonu
export const validateSubscribe = [
  body("email")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.emailRequired");
    })
    .isEmail()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.emailInvalid");
    }),

  body("lang")
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.langInvalid");
    }),

  // meta alanı opsiyonel
  body("meta").optional(),

  validateRequest,
];

// 2️⃣ Newsletter abonelikten çıkma validasyonu
export const validateUnsubscribe = [
  body("email")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.emailRequired");
    })
    .isEmail()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.emailInvalid");
    }),
  validateRequest,
];

// 3️⃣ Abone id (ObjectId) validasyonu
export const validateNewsletterIdParam = [
  param("id")
    .isMongoId()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.invalidId");
    }),
  validateRequest,
];

// 4️⃣ Toplu gönderim validasyonu (send-bulk)
export const validateBulkSend = [
  body("subject")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.subjectRequired");
    })
    .isLength({ min: 2, max: 140 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.subjectLength", { min: 2, max: 140 });
    }),

  body("html")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.htmlRequired");
    })
    .isString()
    .isLength({ min: 4 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, translations, params);
      return t("validation.htmlLength", { min: 4 });
    }),

  body("filter").optional().isObject(),
  validateRequest,
];
