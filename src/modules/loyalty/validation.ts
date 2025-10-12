import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validatePublicList = [
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

export const validatePublicBalance = [
  query("at").optional().isISO8601(), // belirli bir tarih için bakiyeyi hesaplamak istersen
  validateRequest,
];

export const validateAdminList = [
  query("user").optional().isMongoId(),
  query("reason").optional().isString(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

export const validateAdminGetById = [
  param("id").isMongoId(),
  validateRequest,
];

export const validateAdminAdjust = [
  body("user").isMongoId(),
  body("points").isInt().custom(v => v !== 0),
  body("reason").optional().isString(),
  body("order").optional().isMongoId(),
  body("expiresAt").optional().isISO8601(),
  validateRequest,
];

export const validateAdminSpend = [
  param("userId").isMongoId(),
  body("amount").isInt({ min: 1 }),
  body("reason").optional().isString(),
  body("order").optional().isMongoId(),
  validateRequest,
];

export const validateAdminDelete = [
  param("id").isMongoId(),
  validateRequest,
];

export const validateAdminUserBalance = [
  param("userId").isMongoId(),
  query("at").optional().isISO8601(),
  validateRequest,
];
