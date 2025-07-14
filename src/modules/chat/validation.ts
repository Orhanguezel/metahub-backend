import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

// Helper: t() fonksiyonunu locale ile hazırla
function t(req, key) {
  const locale = req.locale || "en";
  // key: "manualMessage.roomIdRequired"
  const keys = key.split(".");
  let result = translations;
  for (const k of keys) result = result[k];
  return result?.[locale] || result?.en || key;
}

// ✅ Validate manual message sending
export const validateManualMessage = [
  body("roomId")
    .notEmpty()
    .withMessage((_, { req }) => t(req, "manualMessage.roomIdRequired"))
    .isString()
    .withMessage((_, { req }) => t(req, "manualMessage.roomIdString")),
  body("message")
    .notEmpty()
    .withMessage((_, { req }) => t(req, "manualMessage.messageRequired"))
    .isString()
    .withMessage((_, { req }) => t(req, "manualMessage.messageString")),
  body("close")
    .optional()
    .isBoolean()
    .withMessage((_, { req }) => t(req, "manualMessage.closeBoolean")),
  validateRequest,
];

// ✅ Validate bulk delete
export const validateBulkDelete = [
  body("ids")
    .isArray({ min: 1 })
    .withMessage((_, { req }) => t(req, "bulkDelete.idsArray")),
  body("ids.*")
    .isMongoId()
    .withMessage((_, { req }) => t(req, "bulkDelete.idMongo")),
  validateRequest,
];

// ✅ Validate single ID param (for deleteMessage)
export const validateIdParam = [
  param("id")
    .isMongoId()
    .withMessage((_, { req }) => t(req, "singleId.invalid")),
  validateRequest,
];

// ✅ Validate roomId param (for getMessagesByRoom, markMessagesAsRead)
export const validateRoomIdParam = [
  param("roomId")
    .notEmpty()
    .withMessage((_, { req }) => t(req, "roomIdParam.required"))
    .isString()
    .withMessage((_, { req }) => t(req, "roomIdParam.string")),
  validateRequest,
];

export const validateSendMessage = [
  body("roomId")
    .notEmpty()
    .withMessage((_, { req }) => t(req, "manualMessage.roomIdRequired"))
    .isString()
    .withMessage((_, { req }) => t(req, "manualMessage.roomIdString")),
  body("message")
    .notEmpty()
    .withMessage((_, { req }) => t(req, "manualMessage.messageRequired"))
    .isString()
    .withMessage((_, { req }) => t(req, "manualMessage.messageString")),
  validateRequest,
];

