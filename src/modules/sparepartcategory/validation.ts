// src/modules/sparepartcategory/validation.ts
import { body, param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

// Çok dilli alanlar için merkezi validation (form-data'dan gelen JSON string için!)
export function validateMultilangField(field: string) {
  return body(field).custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${field} must be an object with at least one language.`);
    }
    if (!Object.values(value).some((val) => val && `${val}`.trim())) {
      throw new Error(`${field} must have at least one language value.`);
    }
    return true;
  });
}

// 🟢 ObjectId validasyonu
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// 🟢 Create Sparepart Category (en az bir dilde name/description zorunlu)
export const validateCreateSparepartCategory = [
  validateMultilangField("name"),
  validateMultilangField("description"),
  validateRequest,
];

// 🟢 Update Sparepart Category (alanlar opsiyonel, varsa tip ve içerik kontrolü)
export const validateUpdateSparepartCategory = [
  body("name")
    .optional()
    .custom((value) => {
      let obj = value;
      if (typeof obj === "string") {
        try {
          obj = JSON.parse(obj);
        } catch {
          throw new Error(`name must be a valid JSON object.`);
        }
      }
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
  body("description")
    .optional()
    .custom((value) => {
      let obj = value;
      if (typeof obj === "string") {
        try {
          obj = JSON.parse(obj);
        } catch {
          throw new Error(`description must be a valid JSON object.`);
        }
      }
      if (obj && typeof obj !== "object")
        throw new Error(`description must be an object.`);
      for (const [lang, val] of Object.entries(obj || {})) {
        if (val && typeof val !== "string") {
          throw new Error(`description.${lang} must be a string.`);
        }
      }
      return true;
    }),
  validateRequest,
];
