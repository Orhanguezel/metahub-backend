// @/modules/bookingslot/bookingslot.validation.ts

import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🔐 SlotRule oluşturma (haftalık veya genel kurallar)
export const validateCreateSlotRule = [
  // Ya dayOfWeek, ya appliesToAll zorunlu olacak (ikisi de gelirse dayOfWeek öncelikli)
  body().custom((value) => {
    if (
      !(
        typeof value.dayOfWeek === "number" ||
        value.appliesToAll === true
      )
    ) {
      throw new Error(
        "Either 'dayOfWeek' (0=Sunday...6=Saturday) or 'appliesToAll': true is required."
      );
    }
    // dayOfWeek gelmişse kontrol et
    if (
      value.dayOfWeek !== undefined &&
      (typeof value.dayOfWeek !== "number" || value.dayOfWeek < 0 || value.dayOfWeek > 6)
    ) {
      throw new Error("dayOfWeek must be between 0 (Sunday) and 6 (Saturday)");
    }
    return true;
  }),
  body("startTime").matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/).withMessage("startTime must be in HH:mm format"),
  body("endTime").matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/).withMessage("endTime must be in HH:mm format"),
  body("intervalMinutes").isInt({ min: 1 }).withMessage("intervalMinutes must be a positive number"),
  body("breakBetweenAppointments").optional().isInt({ min: 0 }).withMessage("breakBetweenAppointments must be a non-negative number"),
  validateRequest,
];

// 🔐 SlotOverride oluşturma (tarih bazlı iptaller)
export const validateCreateSlotOverride = [
  body("date").isISO8601().withMessage("date must be a valid ISO date (YYYY-MM-DD)"),
  body("disabledTimes").optional().isArray().withMessage("disabledTimes must be an array"),
  body("disabledTimes.*")
    .optional()
    .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Each time in disabledTimes must be in HH:mm format"),
  body("fullDayOff").optional().isBoolean().withMessage("fullDayOff must be a boolean"),
  validateRequest,
];

// ♻️ ID validasyonu (reuse)
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];
