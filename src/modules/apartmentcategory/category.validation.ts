import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// 🟢 ObjectId
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

// ✅ Create (en az bir dil zorunlu)
export const validateCreateApartmentCategory = [
  validateMultilangField("name"),
  body("slug").optional().isString(),
  body("city").optional().isString(),
  body("district").optional().isString(),
  body("zip").optional().isString(),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

// ✅ Update (opsiyonel alanlar geçerli olmalı)
export const validateUpdateApartmentCategory = [
  body("name")
    .optional()
    .custom((value) => {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      if (obj && typeof obj !== "object") throw new Error(`name must be an object.`);
      for (const [lang, val] of Object.entries(obj || {})) {
        if (val && typeof val !== "string") throw new Error(`name.${lang} must be a string.`);
      }
      return true;
    }),
  body("slug").optional().isString(),
  body("city").optional().isString(),
  body("district").optional().isString(),
  body("zip").optional().isString(),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

// 🔎 Query (GET /) — opsiyonel filtreler
export const validateCategoryQuery = [
  query("isActive").optional().toBoolean().isBoolean(),
  query("city").optional().isString(),
  query("district").optional().isString(),
  query("zip").optional().isString(),
  validateRequest,
];
