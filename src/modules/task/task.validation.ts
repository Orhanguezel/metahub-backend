import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🔍 ID kontrolü
export const validateObjectIdParam = [
  param("id").isMongoId().withMessage("Invalid task ID."),
  validateRequest,
];

// ➕ Yeni task
export const validateCreateTask = [
  body("title.tr").notEmpty().withMessage("Title (TR) is required."),
  body("title.en").notEmpty().withMessage("Title (EN) is required."),
  body("title.de").notEmpty().withMessage("Title (DE) is required."),

  body("description.tr").optional().isString(),
  body("description.en").optional().isString(),
  body("description.de").optional().isString(),

  body("assignedTo").isMongoId().withMessage("Assigned user ID is required."),
  body("apartment").isMongoId().withMessage("Apartment ID is required."),
  body("period")
    .isIn(["one-time", "daily", "weekly", "bi-weekly", "monthly"])
    .withMessage("Invalid period."),
  validateRequest,
];

// ✏️ Güncelleme
export const validateUpdateTask = [
  ...validateObjectIdParam,
  body("status").optional().isIn(["pending", "in-progress", "paused", "completed", "cancelled"]),
  body("priority").optional().isIn(["low", "normal", "high", "critical"]),
  validateRequest,
];

// 👤 Kullanıcı kendi görevini güncelliyor
export const validateMyTaskUpdate = [
  body("status").isIn(["in-progress", "paused", "completed"]).withMessage("Invalid status update."),
  validateRequest,
];
