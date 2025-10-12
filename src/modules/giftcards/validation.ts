import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validatePublicGet = [
  query("code").isString().trim().notEmpty(),
  validateRequest,
];

export const validatePublicRedeem = [
  body("code").isString().trim().notEmpty(),
  body("amount_cents").isInt({ min: 1 }),
  body("orderId").optional().isMongoId(),
  body("note").optional().isString(),
  validateRequest,
];

// validation.ts
export const validateAdminIssue = [
  body("code").optional().isString().trim(),
  body("initialBalance_cents").isInt({ min: 0 }),
  body("currency").isString().isLength({ min: 3, max: 3 }),
  body("expiresAt")
    .optional()
    .isISO8601()
    .custom((v) => {
      if (new Date(v).getTime() <= Date.now()) {
        throw new Error("expiresAt_must_be_in_the_future");
      }
      return true;
    }),
  validateRequest,
];


export const validateAdminTopup = [
  param("id").isMongoId(),
  body("amount_cents").isInt({ min: 1 }),
  body("note").optional().isString(),
  validateRequest,
];

export const validateAdminDisableEnable = [
  param("id").isMongoId(),
  body("status").isIn(["disabled", "active"]),
  validateRequest,
];

export const validateAdminList = [
  query("q").optional().isString(),
  query("status").optional().isIn(["active","redeemed","expired","disabled"]),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

export const validateAdminGetById = [
  param("id").isMongoId(),
  validateRequest,
];

export const validateAdminUpdateMeta = [
  param("id").isMongoId(),
  body("expiresAt").optional().isISO8601(),
  body("currency").optional().isString().isLength({ min: 3, max: 3 }),
  validateRequest,
];
