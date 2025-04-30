import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// 🎯 Common key validation
const keyValidation = body("key")
  .isString().withMessage("Key must be a string.")
  .trim()
  .notEmpty().withMessage("Key is required.")
  .isLength({ min: 2, max: 100 }).withMessage("Key must be between 2 and 100 characters.");

// 🎯 Flexible value validation
const valueValidation = body("value")
  .custom((val, { req }) => {
    if (typeof val === "string") {
      if (req.body.key === "available_themes") return true;
      if (req.body.key === "site_template") return true;
      return val.trim().length > 0;
    }

    if (Array.isArray(val)) {
      if (req.body.key === "available_themes") {
        if (val.length === 0 || !val.every((v) => typeof v === "string")) {
          throw new Error("Each theme in available_themes must be a non-empty string.");
        }
        return true;
      }
      throw new Error("Array is only allowed for 'available_themes'.");
    }

    if (typeof val === "object" && val !== null) {
      const { tr, en, de } = val;
      if (!tr && !en && !de) {
        throw new Error("At least one of tr, en, or de must be provided in value.");
      }
      return true;
    }

    throw new Error("Invalid value type. Must be string, string[], or { tr, en, de } object.");
  });

export const validateUpsertSetting = [
  keyValidation,
  valueValidation,
  validateRequest,
];

// 🎯 Param validation
export const validateSettingKeyParam = [
  param("key").isString().notEmpty().withMessage("Key parameter is required."),
  validateRequest,
];
