import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// 🟢 ObjectId validasyonu
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Create (→ En az bir dil zorunlu)
export const validateCreateLibraryCategory = [
  validateMultilangField("name"), // merkezi helper kullanıldı
  validateRequest,
];

// ✅ Update (→ Opsiyonel: ama field geldiyse yine geçerli olmalı)
export const validateUpdateLibraryCategory = [
  body("name")
    .optional()
    .custom((value) => {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      if (obj && typeof obj !== "object")
        throw new Error(`name must be an object.`);
      for (const [lang, val] of Object.entries(obj || {})) {
        if (val && typeof val !== "string") {
          throw new Error(`name.${lang} must be a string.`);
        }
      }
      return true;
    }),
  validateRequest,
];
