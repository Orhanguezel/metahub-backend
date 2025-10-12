import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { isValidObjectId } from "@/core/middleware/auth/validation";

const isMongoId = (v: any) => isValidObjectId(String(v));

export const validateObjectId = (field = "id") => [
  param(field).isMongoId(),
  validateRequest,
];

const lineValidator = body("lines").isArray({ min: 1 }).custom((arr) => {
  return arr.every((l: any) =>
    l &&
    Number.isInteger(l.itemIndex) &&
    l.itemIndex >= 0 &&
    Number.isInteger(l.qty) &&
    l.qty > 0 &&
    (l.reason === undefined || typeof l.reason === "string")
  );
});

export const validatePublicCreate = [
  body("orderId").notEmpty().custom(isMongoId),
  lineValidator,
  body("note").optional().isString().isLength({ max: 1000 }),
  validateRequest,
];

export const validateAdminListQuery = [
  query("q").optional().isString(),
  query("status").optional().isIn(["requested","approved","rejected","received","refunded","closed"]),
  query("order").optional().custom((v) => !v || isMongoId(v)),
  query("user").optional().custom((v) => !v || isMongoId(v)),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

export const validateAdminUpdateLines = [
  lineValidator,
  validateRequest,
];

export const validateStatusChange = [
  body("status").isIn(["approved","rejected","received","refunded","closed"]),
  body("note").optional().isString().isLength({ max: 1000 }),
  validateRequest,
];

export const validateAddNote = [
  body("note").isString().isLength({ min: 1, max: 1000 }),
  validateRequest,
];
