import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ➕ Create Task validation
export const validateCreateTask = [
  body("assignedTo").notEmpty().isMongoId().withMessage("assignedTo is required and must be a valid ID."),
  body("apartment").notEmpty().isMongoId().withMessage("apartment is required and must be a valid ID."),
  body("period")
    .notEmpty()
    .isIn(["daily", "weekly", "bi-weekly"])
    .withMessage("period must be one of: daily, weekly, bi-weekly."),
  body("description_tr").notEmpty().withMessage("description_tr is required."),
  body("description_en").notEmpty().withMessage("description_en is required."),
  body("description_de").notEmpty().withMessage("description_de is required."),
  validateRequest,
];

// ✏️ Update Task validation
export const validateUpdateTask = [
  body("description").optional().isObject().withMessage("description must be an object."),
  body("assignedTo").optional().isMongoId().withMessage("assignedTo must be a valid ID."),
  body("apartment").optional().isMongoId().withMessage("apartment must be a valid ID."),
  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("status must be one of: pending, in-progress, completed."),
  body("period")
    .optional()
    .isIn(["daily", "weekly", "bi-weekly"])
    .withMessage("period must be one of: daily, weekly, bi-weekly."),
  validateRequest,
];

// 🆔 Param validation
export const validateTaskId = [
  param("id").isMongoId().withMessage("Invalid task ID."),
  validateRequest,
];
