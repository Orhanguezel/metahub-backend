import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// ✅ Validate manual message sending
export const validateManualMessage = [
  body("roomId")
    .notEmpty()
    .withMessage("Room ID is required.")
    .isString()
    .withMessage("Room ID must be a string."),
  body("message")
    .notEmpty()
    .withMessage("Message is required.")
    .isString()
    .withMessage("Message must be a string."),
  body("close")
    .optional()
    .isBoolean()
    .withMessage("Close must be a boolean."),
  validateRequest,
];

// ✅ Validate bulk delete
export const validateBulkDelete = [
  body("ids")
    .isArray({ min: 1 })
    .withMessage("IDs must be an array with at least one ID."),
  body("ids.*")
    .isMongoId()
    .withMessage("Each ID must be a valid MongoDB ObjectId."),
  validateRequest,
];

// ✅ Validate single ID param (for deleteMessage)
export const validateIdParam = [
  param("id")
    .isMongoId()
    .withMessage("Invalid message ID."),
  validateRequest,
];

// ✅ Validate roomId param (for getMessagesByRoom, markMessagesAsRead)
export const validateRoomIdParam = [
  param("roomId")
    .notEmpty()
    .withMessage("Room ID is required.")
    .isString()
    .withMessage("Room ID must be a string."),
  validateRequest,
];
