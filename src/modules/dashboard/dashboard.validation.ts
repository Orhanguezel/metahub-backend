// src/modules/dashboard/dashboard.validation.ts
// src/modules/dashboard/dashboard.validation.ts
import { query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 📊 Logs query validation
export const validateGetAnalyticsLogs = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be an integer between 1 and 1000."),
  query("module")
    .optional()
    .isString()
    .withMessage("Module must be a string."),
  query("eventType")
    .optional()
    .isString()
    .withMessage("Event type must be a string."),
  query("userId")
    .optional()
    .isMongoId()
    .withMessage("User ID must be a valid Mongo ID."),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO8601 date."),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO8601 date."),
  validateRequest,
];

// 🗓️ Optional: charts/revenue ve charts/orders için tarih filtresi eklemek isterseniz
export const validateChartQuery = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO8601 date."),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO8601 date."),
  validateRequest,
];

// 📈 Genel: raporlar için (ileride kullanılabilir)
export const validateReportQuery = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be an integer between 1 and 100."),
  validateRequest,
];

