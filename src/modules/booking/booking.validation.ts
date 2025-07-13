import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// Her validator içinde, locale'a göre t fonksiyonu tanımlı!
export const validateCreateBooking = [
  body("name")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.nameRequired");
    })
    .isString()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.nameString");
    }),

  body("email")
    .isEmail()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.email");
    }),

  body("phone")
    .optional()
    .isString()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.phone");
    }),

  body("serviceType")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.serviceTypeRequired");
    })
    .isString()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.serviceTypeString");
    }),

  body("note")
    .optional()
    .isString()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.note");
    }),

  body("date")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.dateRequired");
    })
    .isISO8601()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.dateFormat");
    }),

  body("time")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.timeRequired");
    })
    .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.timeFormat");
    }),

  body("service")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.serviceRequired");
    })
    .isMongoId()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.serviceId");
    }),

  body("durationMinutes")
    .optional()
    .isInt({ min: 1 })
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.duration");
    }),

  body("language")
    .notEmpty()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.languageRequired");
    })
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.language", { supported: SUPPORTED_LOCALES.join(", ") });
    }),

  validateRequest,
];

// Status Update (Admin)
export const validateUpdateBookingStatus = [
  body("status")
    .isIn(["pending", "confirmed", "cancelled"])
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.status");
    }),
  validateRequest,
];

// ID Validation (dinamik alan adı)
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) => {
      const locale = req?.locale || getLogLocale();
      const t = (key: string, params?: any) =>
        translate(key, locale, translations, params);
      return t("validation.mongoId", { field });
    }),
  validateRequest,
];
