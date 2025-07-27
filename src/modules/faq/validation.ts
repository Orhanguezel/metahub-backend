import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// ✅ ObjectId param validator
export const validateFAQId = [
  param("id")
    .isMongoId()
    .withMessage((_, { req }) => {
      const t = (key: string) =>
        translate(key, req.locale || getLogLocale(), translations);
      return t("validation.invalidObjectId");
    }),
  validateRequest,
];

// ✅ CREATE: POST /admin/faqs
export const validateCreateFAQ = [
  validateMultilangField("question"), // çok dilli alan kontrolü
  validateMultilangField("answer"),
  body("category").optional().isString(),
  body("isActive").optional().isBoolean(),
  body("isPublished").optional().isBoolean(),
  body("publishedAt").optional().isISO8601().toDate(),
  validateRequest,
];

// ✅ UPDATE: PUT /admin/faqs/:id
export const validateUpdateFAQ = [
  ...validateFAQId, // spread kullan
  body("question").optional().customSanitizer((v) => (typeof v === "string" ? JSON.parse(v) : v)),
  body("answer").optional().customSanitizer((v) => (typeof v === "string" ? JSON.parse(v) : v)),
  body("category").optional().isString(),
  body("isActive").optional().isBoolean(),
  body("isPublished").optional().isBoolean(),
  body("publishedAt").optional().isISO8601().toDate(),
  body("embedding")
    .optional()
    .isArray()
    .withMessage("Embedding must be an array.")
    .custom((arr: any[]) => arr.every((v) => typeof v === "number"))
    .withMessage("All embedding values must be numbers."),
  validateRequest,
];


// ✅ PUBLIC ASK: POST /faqs/ask
export const validateAskFAQ = [
  body("question").notEmpty().withMessage("Question is required."),
  body("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage("Invalid language."),
  validateRequest,
];
