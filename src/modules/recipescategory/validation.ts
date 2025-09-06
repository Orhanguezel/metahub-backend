import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";

const tReq = (req: any) => (k: string) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations);

const orderValidator = (val: any, { req }: any) => {
  if (val == null || val === "") return true;
  const n = Number(val);
  if (!Number.isFinite(n) || Math.round(n) !== n || n < 0 || n > 100000) {
    throw new Error(tReq(req)("validation.orderInvalid"));
  }
  return true;
};

// 🟢 ObjectId
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage("Invalid ObjectId"),
  validateRequest,
];

// ✅ Create
export const validateCreateRecipeCategory = [
  body("name").custom(validateMultilangField),
  body("slug").optional().isString().withMessage((_, { req }) => tReq(req)("validation.slugInvalid")),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  body("order").optional().custom(orderValidator),
  validateRequest,
];

// ✅ Update
export const validateUpdateRecipeCategory = [
  body("name").optional().custom(validateMultilangField),
  body("slug").optional().isString().withMessage((_, { req }) => tReq(req)("validation.slugInvalid")),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  body("order").optional().custom(orderValidator),
  validateRequest,
];

// ✅ Public/List query
export const validateListQuery = [
  query("q").optional().isString(),
  query("isActive").optional().toBoolean().isBoolean(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
