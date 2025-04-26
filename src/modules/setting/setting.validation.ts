import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import {SettingKeys}  from "./settingKeys";

// 🎯 Setting oluştur/güncelle validation
export const validateUpsertSetting = [
  body("key")
    .isString()
    .notEmpty()
    .withMessage("Key is required.")
    .isIn(Object.values(SettingKeys))
    .withMessage("Invalid setting key."),
  body("value.tr")
    .optional()
    .isString()
    .withMessage("Turkish value must be a string."),
  body("value.en")
    .optional()
    .isString()
    .withMessage("English value must be a string."),
  body("value.de")
    .optional()
    .isString()
    .withMessage("German value must be a string."),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean."),
  validateRequest,
];

// 🎯 Setting silme veya getirme validation
export const validateSettingKeyParam = [
  param("key")
    .isString()
    .notEmpty()
    .withMessage("Key parameter is required."),
  validateRequest,
];
