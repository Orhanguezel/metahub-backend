import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import i18n from "./i18n";

const t = (req: any, k: string) => translate(k, req?.locale || getLogLocale(), i18n);

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_: any, { req }: any) => t(req, "validation.invalidObjectId")),
  validateRequest,
];

export const validateOwnerOptional = [
  // public uçlarda session ile çalışabilmek için
  body("session").optional().isString(),
  validateRequest,
];

export const validateAddItem = [
  body("product")
    .notEmpty().withMessage((_: any, { req }: any) => t(req, "validation.productRequired"))
    .isMongoId().withMessage((_: any, { req }: any) => t(req, "validation.invalidObjectId")),
  body("variant").optional().isMongoId(),
  body("note").optional().isString(),
  body("session").optional().isString(),
  validateRequest,
];

export const validateRemoveItem = [
  body("product").notEmpty().isMongoId(),
  body("variant").optional().isMongoId(),
  body("session").optional().isString(),
  validateRequest,
];

export const validateListQuery = [
  query("user").optional().isMongoId(),
  query("session").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
  validateRequest,
];

export const validateMerge = [
  body("fromSession").notEmpty().isString(),
  validateRequest,
];
