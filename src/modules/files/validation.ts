import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)),
  validateRequest,
];

export const validateAdminListQuery = [
  query("kind").optional().isIn(["image", "pdf", "doc", "other"]),
  query("mime").optional().isString(),
  query("module").optional().isString(),
  query("refId").optional().isMongoId(),
  query("active").optional().toBoolean().isBoolean(),
  validateRequest,
];

export const validateLinkPayload = [
  body("module").exists().isString().trim(),
  body("refId").exists().isMongoId(),
  validateRequest,
];
