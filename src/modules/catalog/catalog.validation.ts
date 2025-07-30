import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import catalogTranslations from "./i18n";
import type { SupportedLocale } from "@/types/common";

// --- Katalog talebi göndermek için validation ---
export const validateSendCatalogRequest = [
  body("name")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.nameRequired");
    })
    .isLength({ min: 2, max: 50 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.nameLength", { min: 2, max: 50 });
    }),

  body("email")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.emailRequired");
    })
    .isEmail()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.emailInvalid");
    }),

  body("phone")
    .optional()
    .isString()
    .isLength({ min: 6, max: 32 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.phoneLength", { min: 6, max: 32 });
    }),

  body("company")
    .optional()
    .isString()
    .isLength({ min: 2, max: 64 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.companyLength", { min: 2, max: 64 });
    }),

  body("locale")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.localeRequired");
    })
    .isIn(["en", "tr", "de", "pl", "fr", "es"]) // Desteklenen dillerin tamamı burada güncel tutulmalı!
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.localeInvalid");
    }),

  body("catalogType")
    .optional()
    .isString()
    .isLength({ min: 2, max: 40 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.catalogTypeLength", { min: 2, max: 40 });
    }),

  body("subject")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.subjectRequired");
    })
    .isLength({ min: 3, max: 100 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.subjectLength", { min: 3, max: 100 });
    }),

  body("message")
    .optional()
    .isString()
    .isLength({ min: 5, max: 1000 })
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.messageLength", { min: 5, max: 1000 });
    }),

  validateRequest,
];

// --- Katalog talep id'si validasyonu (Mongo ObjectId) ---
export const validateCatalogRequestIdParam = [
  param("id")
    .isMongoId()
    .withMessage((_, { req }) => {
      const locale: SupportedLocale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) => translate(key, locale, catalogTranslations, params);
      return t("validation.invalidMessageId");
    }),
  validateRequest,
];
