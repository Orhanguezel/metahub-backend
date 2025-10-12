import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validatePublicSearchQuery = [
  query("q").isString().trim().notEmpty(),
  query("type").optional().isIn(["product", "brand", "category", "content"]),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("page").optional().isInt({ min: 1, max: 200 }).toInt(),
  validateRequest,
];

export const validateSuggestQuery = [
  query("q").isString().trim().notEmpty(),
  query("type").optional().isIn(["product", "brand", "category", "search"]),
  query("limit").optional().isInt({ min: 1, max: 20 }).toInt(),
  validateRequest,
];

export const validateTrackSearch = [
  body("q").isString().trim().notEmpty(),
  body("type").optional().isIn(["product", "brand", "category", "search"]),
  validateRequest,
];

/** Admin */
export const validateObjectId = (field: string) => [
  param(field).isMongoId(),
  validateRequest,
];

export const validateIndexListQuery = [
  query("q").optional().isString(),
  query("type").optional().isIn(["product", "brand", "category", "content"]),
  query("isActive").optional().toBoolean().isBoolean(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
  validateRequest,
];

export const validateRebuild = [
  body("types").optional().isArray(),
  body("types.*").optional().isIn(["product", "brand", "category", "content"]),
  validateRequest,
];

export const validateUpsertOne = [
  body("type").isIn(["product", "brand", "category", "content"]),
  body("ref").isObject(),
  body("ref.collection").isString().trim().notEmpty(),
  body("ref.id").isMongoId(),
  body("title").optional().isObject(),
  body("subtitle").optional().isObject(),
  body("keywords").optional().isArray(),
  body("searchable").optional().isString(),
  body("boost").optional().isInt({ min: 0 }).toInt(),
  body("isActive").optional().toBoolean().isBoolean(),
  // image hem string hem obje olabilir → ikisine de izin ver:
  body("image").optional().custom((v) => typeof v === "string" || typeof v === "object"),
  validateRequest,
];
