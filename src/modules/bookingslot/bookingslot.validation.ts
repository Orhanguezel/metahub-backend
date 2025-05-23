import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🔐 SlotRule oluşturma (haftalık kurallar)
export const validateCreateSlotRule = [
  body("dayOfWeek")
    .isInt({ min: 0, max: 6 })
    .withMessage("dayOfWeek must be between 0 (Sunday) and 6 (Saturday)"),
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
