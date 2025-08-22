import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// ----- helpers -----
const parseIfJson = (value: any) => { try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return value; } };

const sanitizeTagsFlexible = (value: any) => {
  const v = parseIfJson(value);
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

// ✅ ObjectId
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)),
  validateRequest,
];

// ✅ Create Validator
export const validateCreateLibrary = [
  validateMultilangField("title"),
  body("summary").optional().customSanitizer(parseIfJson),
  body("content").optional().customSanitizer(parseIfJson),

  body("tags").optional().customSanitizer(sanitizeTagsFlexible),
  body("category")
    .exists({ checkFalsy: true })
    .withMessage((_, { req }) => translate("validation.invalidCategory", req.locale || getLogLocale(), translations))
    .bail()
    .isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidCategory", req.locale || getLogLocale(), translations)),
  validateRequest,
];

// ✅ Update Validator
export const validateUpdateLibrary = [
  body("title").optional().customSanitizer(parseIfJson),
  body("summary").optional().customSanitizer(parseIfJson),
  body("content").optional().customSanitizer(parseIfJson),

  body("tags").optional().customSanitizer(sanitizeTagsFlexible),
  body("category").optional().isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidCategory", req.locale || getLogLocale(), translations)),

  // removedImages: URL string[] veya {id|publicId|url}[]
  body("removedImages").optional().custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (!Array.isArray(parsed)) throw new Error();
      const ok = parsed.every((x: any) =>
        typeof x === "string" ||
        (x && typeof x === "object" && ("url" in x || "publicId" in x || "_id" in x || "id" in x))
      );
      if (!ok) throw new Error();
      return true;
    } catch {
      logger.withReq.warn(req as any, t("validation.invalidRemovedImages"), { ...getRequestContext(req), value: val, path: "removedImages" });
      throw new Error(t("validation.invalidRemovedImages"));
    }
  }),

  // id listeleri (removeImageIds / removedImageIds) → string[] veya tekil string
  body(["removeImageIds", "removedImageIds"]).optional().custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (Array.isArray(parsed)) return true;
      if (typeof val === "string") return true; // tekil gönderimi de kabul
      throw new Error();
    } catch {
      logger.withReq.warn(req as any, t("validation.invalidRemovedImages"), { ...getRequestContext(req), value: val, path: "removedImageIds" });
      throw new Error(t("validation.invalidRemovedImages"));
    }
  }),

  // Sıralama
  body("existingImagesOrderIds").optional().custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    try { const parsed = typeof val === "string" ? JSON.parse(val) : val; if (!Array.isArray(parsed)) throw new Error(); return true; }
    catch { throw new Error(t("validation.invalidOrder")); }
  }),
  body("existingImagesOrder").optional().custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    try { const parsed = typeof val === "string" ? JSON.parse(val) : val; if (!Array.isArray(parsed)) throw new Error(); return true; }
    catch { throw new Error(t("validation.invalidOrder")); }
  }),

  // Dosya silme
  body("removedFiles").optional().custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (!Array.isArray(parsed)) throw new Error();
      return true;
    } catch {
      logger.withReq.warn(req as any, t("validation.invalidRemovedFiles"), { ...getRequestContext(req), value: val, path: "removedFiles" });
      throw new Error(t("validation.invalidRemovedFiles"));
    }
  }),

  validateRequest,
];

// ✅ Admin query
export const validateAdminQuery = [
  query("language").optional().isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) => translate("validation.invalidLanguage", req.locale || getLogLocale(), translations)),
  query("category").optional().isMongoId()
    .withMessage((_, { req }) => translate("validation.invalidCategory", req.locale || getLogLocale(), translations)),
  query("isPublished").optional().toBoolean().isBoolean()
    .withMessage((_, { req }) => translate("validation.booleanField", req.locale || getLogLocale(), translations)),
  query("isActive").optional().toBoolean().isBoolean()
    .withMessage((_, { req }) => translate("validation.booleanField", req.locale || getLogLocale(), translations)),
  validateRequest,
];
