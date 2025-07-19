import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// ObjectId Validator (değişmedi)
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// CREATE Validator (sadece category ve images zorunlu)
export const validateCreateReferences = [
  // Opsiyonel çok dilli alanlar
  body("title").optional().customSanitizer(parseIfJson),
  body("content").optional().customSanitizer(parseIfJson),

  // Zorunlu: category
  body("category")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.requiredCategory", req.locale || getLogLocale(), translations)
    )
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    ),

  // Zorunlu: images (en az bir tane)
  body("images")
    .custom((val, { req }) => {
      // images, upload sonrası req.files üzerinden de gelebilir, form-data ile body.images veya files olabilir
      if (Array.isArray(val) && val.length > 0) return true;
      // Multer veya başka upload middleware kullandığında req.files üzerinden kontrol et
      if (req.files && Array.isArray(req.files) && req.files.length > 0) return true;
      throw new Error(
        translate("validation.requiredImages", req.locale || getLogLocale(), translations)
      );
    }),

  validateRequest,
];

// UPDATE Validator (hiçbir alan zorunlu değil)
export const validateUpdateReferences = [
  body("title").optional().customSanitizer(parseIfJson),
  body("content").optional().customSanitizer(parseIfJson),
  body("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    ),
  body("images")
    .optional()
    .custom((val, { req }) => {
      if (val === undefined) return true;
      if (Array.isArray(val)) return true;
      // Upload sırasında da kontrol edilebilir ama zorunlu değil
      return true;
    }),
  body("removedImages")
    .optional()
    .custom((val, { req }) => {
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        const t = (key: string) =>
          translate(key, req.locale || getLogLocale(), translations);
        logger.withReq.warn(req as any, t("validation.invalidRemovedImages"), {
          ...getRequestContext(req),
          value: val,
          path: "removedImages",
        });
        throw new Error(t("validation.invalidRemovedImages"));
      }
    }),

  validateRequest,
];

// Admin Query Validator (değişmedi)
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) =>
      translate("validation.invalidLanguage", req.locale || getLogLocale(), translations)
    ),
  query("category")
    .optional()
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    ),
  query("isPublished")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.booleanField", req.locale || getLogLocale(), translations)
    ),
  query("isActive")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage((_, { req }) =>
      translate("validation.booleanField", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// JSON Parse Helper
function parseIfJson(value: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}
