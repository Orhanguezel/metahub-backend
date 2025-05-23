import { query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 📊 Analytics Logs Query Validation
export const validateGetAnalyticsLogs = [
  query("limit").optional().isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be an integer between 1 and 1000."),
  query("module").optional().isString()
    .withMessage("Module must be a string."),
  query("eventType").optional().isString()
    .withMessage("Event type must be a string."),
  query("userId").optional().isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId."),
  query("startDate").optional().isISO8601()
    .withMessage("Start date must be a valid ISO8601 date."),
  query("endDate").optional().isISO8601()
    .withMessage("End date must be a valid ISO8601 date."),
  validateRequest,
];

// 📈 Charts (orders, revenue) Query Validation - Tarih aralığı desteği
export const validateChartQuery = [
  query("startDate").optional().isISO8601()
    .withMessage("Start date must be a valid ISO8601 date."),
  query("endDate").optional().isISO8601()
    .withMessage("End date must be a valid ISO8601 date."),
  validateRequest,
];

// 📑 Raporlar için (ileride genişletilebilir)
export const validateReportQuery = [
  query("limit").optional().isInt({ min: 1, max: 100 })
    .withMessage("Limit must be an integer between 1 and 100."),
  validateRequest,
];
