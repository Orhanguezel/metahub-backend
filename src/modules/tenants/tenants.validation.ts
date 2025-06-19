import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ ObjectId Validator
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate(
        "validation.invalidObjectId",
        req.locale || getLogLocale(),
        translations
      )
    ),
  validateRequest,
];

// ✅ Create Tenant Validator
export const validateCreateTenants = [
  validateMultilangField("name"),
  body("slug")
    .notEmpty()
    .trim()
    .isString()
    .toLowerCase()
    .withMessage((_, { req }) =>
      translate(
        "validation.slugRequired",
        req.locale || getLogLocale(),
        translations
      )
    ),
  body("mongoUri").notEmpty().isString(),
  body("domain").customSanitizer(parseIfJson),
  body("domain.main")
    .notEmpty()
    .isString()
    .withMessage((_, { req }) =>
      translate(
        "validation.domainMainRequired",
        req.locale || getLogLocale(),
        translations
      )
    ),
  body("emailSettings").customSanitizer(parseIfJson),
  body("emailSettings.smtpHost")
    .notEmpty()
    .withMessage("SMTP Host is required."),
  body("emailSettings.smtpPort")
    .notEmpty()
    .isNumeric()
    .withMessage("SMTP Port is required."),
  body("emailSettings.smtpUser")
    .notEmpty()
    .withMessage("SMTP User is required."),
  body("emailSettings.smtpPass")
    .notEmpty()
    .withMessage("SMTP Pass is required."),
  body("emailSettings.senderName")
    .notEmpty()
    .withMessage("SMTP Sender Name is required."),
  body("emailSettings.senderEmail")
    .notEmpty()
    .isEmail()
    .withMessage("SMTP Sender Email must be valid."),
  body("enabledModules")
    .optional()
    .customSanitizer(parseIfJson)
    .isArray()
    .withMessage("enabledModules must be an array."),
  body("description").optional().customSanitizer(parseIfJson),
  body("metaTitle").optional().customSanitizer(parseIfJson),
  body("metaDescription").optional().customSanitizer(parseIfJson),
  body("address").optional().customSanitizer(parseIfJson),
  body("social").optional().customSanitizer(parseIfJson),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

// ✅ Update Tenant Validator
export const validateUpdateTenants = [
  body("name").optional().customSanitizer(parseIfJson),
  body("slug").optional().trim().isString().toLowerCase(),
  body("mongoUri").optional().isString(),
  body("domain").optional().customSanitizer(parseIfJson),
  body("domain.main").optional().isString(),
  body("emailSettings").optional().customSanitizer(parseIfJson),
  body("enabledModules")
    .optional()
    .customSanitizer(parseIfJson)
    .isArray()
    .withMessage("enabledModules must be an array."),
  body("description").optional().customSanitizer(parseIfJson),
  body("metaTitle").optional().customSanitizer(parseIfJson),
  body("metaDescription").optional().customSanitizer(parseIfJson),
  body("address").optional().customSanitizer(parseIfJson),
  body("social").optional().customSanitizer(parseIfJson),
  body("isActive").optional().toBoolean().isBoolean(),
  body("removedImages")
    .optional()
    .custom((val, { req }) => {
      try {
        const parsed = parseIfJson(val);
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        throw new Error(
          translate(
            "validation.invalidRemovedImages",
            req.locale || getLogLocale(),
            translations
          )
        );
      }
    }),
  validateRequest,
];
