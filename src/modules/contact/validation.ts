// src/modules/contact/validation.ts
import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

// Contact message gönderimi
export const validateSendMessage = [
  body("name")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.nameRequired");
    })
    .isLength({ min: 2, max: 50 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.nameLength", { min: 2, max: 50 });
    }),

  body("email")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.emailRequired");
    })
    .isEmail()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.emailInvalid");
    }),

  body("subject")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.subjectRequired");
    })
    .isLength({ min: 3, max: 100 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.subjectLength", { min: 3, max: 100 });
    }),

  body("message")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.messageRequired");
    })
    .isLength({ min: 5, max: 1000 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.messageLength", { min: 5, max: 1000 });
    }),

  validateRequest,
];

// Contact mesaj id validasyonu
export const validateContactIdParam = [
  param("id")
    .isMongoId()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.invalidMessageId");
    }),
  validateRequest,
];
