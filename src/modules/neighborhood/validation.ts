import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

/* ObjectId */
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId.`),
  validateRequest,
];

/* CREATE */
export const validateCreateNeighborhood = [
  validateMultilangField("name"),          // en az bir dil
  body("slug").optional().isString(),
  body("city").optional().isString(),
  body("district").optional().isString(),
  body("zip").optional().isString(),
  body("codes").optional().isObject(),
  body("geo").optional().isObject(),
  body("aliases").optional().isArray(),
  body("aliases.*").optional().isString(),
  body("tags").optional().isArray(),
  body("tags.*").optional().isString(),
  body("sortOrder").optional().isInt(),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

/* UPDATE */
export const validateUpdateNeighborhood = [
  body("name").optional().custom((value) => {
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
  body("codes").optional().isObject(),
  body("geo").optional().isObject(),
  body("aliases").optional().isArray(),
  body("aliases.*").optional().isString(),
  body("tags").optional().isArray(),
  body("tags.*").optional().isString(),
  body("sortOrder").optional().isInt(),
  body("isActive").optional().toBoolean().isBoolean(),
  validateRequest,
];

/* LIST query */
export const validateNeighborhoodListQuery = [
  query("isActive").optional().toBoolean().isBoolean(),
  query("city").optional().isString(),
  query("district").optional().isString(),
  query("zip").optional().isString(),
  query("cityCode").optional().isString(),
  query("districtCode").optional().isString(),
  query("tag").optional().isString(),
  query("q").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
