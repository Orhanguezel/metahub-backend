import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

/* Common helpers */
const kinds = ["LIKE", "FAVORITE", "BOOKMARK", "EMOJI", "RATING"] as const;

export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

const isEmoji = (s: string) => typeof s === "string" && s.trim().length > 0 && s.length <= 8;

/* ----- Public: toggle/set ----- */
export const validateToggle = [
  body("targetType").isString().notEmpty().withMessage((_, { req }) =>
    translate("validation.invalidTarget", req.locale || getLogLocale(), translations)
  ),
  body("targetId").isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidTarget", req.locale || getLogLocale(), translations)
  ),
  body("kind").isIn(kinds as unknown as string[]).withMessage((_, { req }) =>
    translate("validation.invalidKind", req.locale || getLogLocale(), translations)
  ),
  body("emoji")
    .optional({ nullable: true, checkFalsy: true })
    .custom((v, { req }) => {
      const k = req.body?.kind;
      if (k === "EMOJI") return isEmoji(String(v));
      return true;
    })
    .withMessage((_, { req }) =>
      translate("validation.invalidEmoji", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];


export const validateSet = [
  ...validateToggle,
  body("on").isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* ----- Public: summary/my ----- */
export const validateSummaryQuery = [
  query("targetType").isString().notEmpty(),
  query("targetId").optional({ checkFalsy: true, nullable: true }).isMongoId(),
  query("targetIds").optional({ checkFalsy: true, nullable: true }).isString(), // CSV
  query("breakdown")
    .optional({ checkFalsy: true, nullable: true })
    .isIn(["none", "kind", "emoji", "kind+emoji"]),
  validateRequest,
];

export const validateMyQuery = [
  query("targetType").isString().notEmpty(),
  query("targetIds").optional({ checkFalsy: true, nullable: true }).isString(), // CSV
  validateRequest,
];

/* ----- Rating ----- */
export const validateRate = [
  body("targetType").isString().notEmpty().withMessage((_, { req }) =>
    translate("validation.invalidTarget", req.locale || getLogLocale(), translations)
  ),
  body("targetId").isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidTarget", req.locale || getLogLocale(), translations)
  ),
  body("value").isInt({ min: 1, max: 5 }).withMessage((_, { req }) =>
    translate("validation.required", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

export const validateRatingSummaryQuery = [
  query("targetType").isString().notEmpty(),
  query("targetId").optional().isMongoId(),
  query("targetIds").optional().isString(), // CSV
  validateRequest,
];

/* ----- Admin ----- */
export const validateAdminQuery = [
  query("user").optional({ checkFalsy: true, nullable: true }).isMongoId(),
  query("targetType").optional({ checkFalsy: true, nullable: true }).isString(),
  query("targetId").optional({ checkFalsy: true, nullable: true }).isMongoId(),
  query("kind")
    .optional({ checkFalsy: true, nullable: true })
    .isIn(kinds as unknown as string[]),
  query("emoji").optional({ checkFalsy: true, nullable: true }).isString(),
  query("isActive")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean(),
  query("page").optional({ checkFalsy: true, nullable: true }).toInt(),
  query("limit").optional({ checkFalsy: true, nullable: true }).toInt(),
  query("value")
    .optional({ checkFalsy: true, nullable: true })
    .toInt()
    .isInt({ min: 1, max: 5 }),
  validateRequest,
];