import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { isValidObjectId } from "@/core/middleware/auth/validation";

/* Helpers */
const isMongoIdOrEmpty = (v: any) => !v || isValidObjectId(String(v));

export const validateObjectId = (field = "id") => [
  param(field).isMongoId(),
  validateRequest,
];

export const validatePublicCreate = [
  body("product").notEmpty().custom(isValidObjectId).withMessage("invalid_product"),
  body("rating").isInt({ min: 1, max: 5 }),
  body("title").optional().isString().isLength({ max: 300 }),
  body("content").optional().isString().isLength({ max: 5000 }),
  body("images").optional().isArray(),
  validateRequest,
];

export const validatePublicListQuery = [
  query("product").optional().custom(isMongoIdOrEmpty),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("sort").optional().isIn(["newest","oldest","rating_desc","rating_asc","helpful"]),
  validateRequest,
];

export const validateAdminListQuery = [
  query("product").optional().custom(isMongoIdOrEmpty),
  query("user").optional().custom(isMongoIdOrEmpty),
  query("status").optional().isIn(["pending","approved","rejected"]),
  query("q").optional().isString(),
  query("minRating").optional().isInt({ min: 1, max: 5 }),
  query("maxRating").optional().isInt({ min: 1, max: 5 }),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("sort").optional().isIn(["newest","oldest","rating_desc","rating_asc","helpful"]),
  validateRequest,
];

export const validateAdminUpdate = [
  body("rating").optional().isInt({ min: 1, max: 5 }),
  body("title").optional().isString().isLength({ max: 300 }),
  body("content").optional().isString().isLength({ max: 5000 }),
  body("images").optional().isArray(),
  body("status").optional().isIn(["pending","approved","rejected"]),
  validateRequest,
];

export const validateChangeStatus = [
  body("status").isIn(["pending","approved","rejected"]),
  validateRequest,
];
