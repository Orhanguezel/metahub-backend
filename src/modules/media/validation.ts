import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateList = [
  query("q").optional().isString(),
  query("tag").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

export const validateGetById = [ param("id").isMongoId(), validateRequest ];

export const validateUpload = [
  body("tags").optional().isArray(),
  body("mime").optional().isString(),
  body("filename").optional().isString(),
  validateRequest,
];

export const validateUpdateTags = [
  param("id").isMongoId(),
  body("tags").isArray(),
  validateRequest,
];

export const validateReplace = [
  param("id").isMongoId(),
  body("filename").optional().isString(),
  body("mime").optional().isString(),
  validateRequest,
];

export const validateDelete = [ param("id").isMongoId(), validateRequest ];

export const validateSignedParams = [
  body("folder").optional().isString(),
  validateRequest,
];
