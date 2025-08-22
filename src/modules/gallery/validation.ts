import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

/* helpers */
const parseIfJson = (value: any) => {
  try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return value; }
};
const sanitizeTagsFlexible = (value: any) => {
  const v = parseIfJson(value);
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

/* ObjectId */
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

/* Create */
export const validateCreateGallery = [
  validateMultilangField("title"),
  body("summary").optional().customSanitizer(parseIfJson),
  body("content").optional().customSanitizer(parseIfJson),
  body("tags").optional().customSanitizer(sanitizeTagsFlexible),
  body("category")
    .exists({ checkFalsy: true })
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    )
    .bail()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

/* Update */
export const validateUpdateGallery = [
  body("title").optional().customSanitizer(parseIfJson),
  body("summary").optional().customSanitizer(parseIfJson),
  body("content").optional().customSanitizer(parseIfJson),
  body("tags").optional().customSanitizer(sanitizeTagsFlexible),
  body("category").optional().isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
  ),
  body("removedImages")
    .optional()
    .custom((val, { req }) => {
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        const t = (key: string) => translate(key, req.locale || getLogLocale(), translations);
        logger.withReq.warn(req as any, t("validation.invalidRemovedImages"), {
          ...getRequestContext(req),
          value: val,
          path: "removedImages",
        });
        throw new Error(t("validation.invalidRemovedImages"));
      }
    }),
  // (opsiyonel) mevcut görsellerin sırası string[] JSON
  body("existingImagesOrder").optional().custom((val) => {
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (!Array.isArray(parsed)) throw new Error();
      return true;
    } catch {
      return false;
    }
  }),
  validateRequest,
];

/* Admin query */
export const validateAdminQuery = [
  query("language").optional().isIn(SUPPORTED_LOCALES).withMessage((_, { req }) =>
    translate("validation.invalidLanguage", req.locale || getLogLocale(), translations)
  ),
  query("category").optional().isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
  ),
  query("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* Public query */
export const validatePublicQuery = [
  query("category").optional().isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
  ),
  query("onlyLocalized").optional().isIn(["true", "false"]).withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

/* Eski isimlerle alias */
export const validateUploadGallery = validateCreateGallery;
export const validateGalleryIdParam = (reqField = "id") => validateObjectId(reqField);
