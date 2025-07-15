import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// Standart çeviri fonksiyonu
const t = (req: any, key: string, params?: any) =>
  translate(key, req?.locale || getLogLocale(), translations, params);

// --- SlotRule: Haftalık Genel Kural ---
export const validateCreateSlotRule = [
  body().custom((val, { req }) => {
    // dayOfWeek veya appliesToAll zorunlu!
    if (!((typeof val.dayOfWeek === "number") || val.appliesToAll === true)) {
      throw new Error(
        t(req, "slot.validation.dayOfWeekOrAll")
        // Çeviri dosyası: "slot.validation.dayOfWeekOrAll": "Either 'dayOfWeek' (0=Sunday...6=Saturday) or 'appliesToAll': true is required."
      );
    }
    if (
      val.dayOfWeek !== undefined &&
      (typeof val.dayOfWeek !== "number" || val.dayOfWeek < 0 || val.dayOfWeek > 6)
    ) {
      throw new Error(
        t(req, "slot.validation.dayOfWeekRange")
        // "slot.validation.dayOfWeekRange": "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)."
      );
    }
    return true;
  }),
  body("startTime")
    .exists().withMessage((_, { req }) => t(req, "slot.validation.startTimeRequired"))
    .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .withMessage((_, { req }) => t(req, "slot.validation.startTimeFormat")),
  body("endTime")
    .exists().withMessage((_, { req }) => t(req, "slot.validation.endTimeRequired"))
    .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .withMessage((_, { req }) => t(req, "slot.validation.endTimeFormat")),
  body("intervalMinutes")
    .exists().withMessage((_, { req }) => t(req, "slot.validation.intervalMinutesRequired"))
    .isInt({ min: 1 })
    .withMessage((_, { req }) => t(req, "slot.validation.intervalMinutes")),
  body("breakBetweenAppointments")
    .optional()
    .isInt({ min: 0 })
    .withMessage((_, { req }) => t(req, "slot.validation.breakBetweenAppointments")),
  body("label")
    .optional()
    .isObject()
    .withMessage((_, { req }) => t(req, "slot.validation.label")),
  body("description")
    .optional()
    .isObject()
    .withMessage((_, { req }) => t(req, "slot.validation.description")),
  validateRequest,
];

// --- SlotOverride: Özel Gün ---
export const validateCreateSlotOverride = [
  body("date")
    .exists().withMessage((_, { req }) => t(req, "slot.validation.dateRequired"))
    .isISO8601()
    .withMessage((_, { req }) => t(req, "slot.validation.date")),
  body("disabledTimes")
    .optional()
    .isArray()
    .withMessage((_, { req }) => t(req, "slot.validation.disabledTimes")),
  body("disabledTimes.*")
    .optional()
    .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .withMessage((_, { req }) => t(req, "slot.validation.disabledTimesItem")),
  body("fullDayOff")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) => t(req, "slot.validation.fullDayOff")),
  validateRequest,
];

// --- ObjectId Validator (Reusable) ---
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) => t(req, "slot.validation.objectId", { field })),
  validateRequest,
];
