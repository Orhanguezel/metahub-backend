import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

/* Basit slug regex: en küçük 1 karakter, sadece a-z0-9 ve tire */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* 🟢 ObjectId validasyonu */
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

/* ✅ Create */
export const validateCreateReferencesCategory = [
  validateMultilangField("name"), // en az bir dil dolu
  body("slug").optional().isString().trim().toLowerCase().matches(slugPattern)
    .withMessage("slug must contain only a-z, 0-9 and hyphen."),
  validateRequest,
];

/* ✅ Update */
export const validateUpdateReferencesCategory = [
  body("name")
    .optional()
    .custom((value) => {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      if (obj && typeof obj !== "object") throw new Error(`name must be an object.`);
      for (const [lang, val] of Object.entries(obj || {})) {
        if (val && typeof val !== "string") {
          throw new Error(`name.${lang} must be a string.`);
        }
      }
      return true;
    }),
  body("isActive").optional().isBoolean().withMessage("isActive must be boolean."),
  body("slug").optional().isString().trim().toLowerCase().matches(slugPattern)
    .withMessage("slug must contain only a-z, 0-9 and hyphen."),
  validateRequest,
];
