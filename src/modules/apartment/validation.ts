// src/modules/apartment/validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

// --- Helpers ---
function parseIfJson(value: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}

const PERIOD_UNITS = ["day", "week", "month"];
const FEE_TYPES = ["dues", "cleaning", "security", "trash", "custom"];
const FEE_PERIODS = ["once", "weekly", "monthly", "quarterly", "yearly"];

// --- Common validators ---
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
    ),
  validateRequest,
];

// ---- Field-level custom validators ----

// address { city, country } required (create), others optional
const validateAddressRequired = body("address")
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("validation.addressRequired"));
    if (!val.city || typeof val.city !== "string") throw new Error(t("validation.addressCity"));
    if (!val.country || typeof val.country !== "string")
      throw new Error(t("validation.addressCountry"));
    // optional zip/state/street/number/district/fullText ok
    return true;
  });

const validateAddressOptional = body("address")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("validation.addressInvalid"));
    if (val.city && typeof val.city !== "string") throw new Error(t("validation.addressCity"));
    if (val.country && typeof val.country !== "string")
      throw new Error(t("validation.addressCountry"));
    return true;
  });

// location GeoJSON Point optional
const validateLocationOptional = body("location")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("validation.locationInvalid"));
    if (val.type && val.type !== "Point") throw new Error(t("validation.locationType"));
    const coords = val.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2)
      throw new Error(t("validation.locationCoordinates"));
    const [lng, lat] = coords;
    if (typeof lng !== "number" || typeof lat !== "number")
      throw new Error(t("validation.locationCoordinates"));
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90)
      throw new Error(t("validation.locationRange"));
    return true;
  });

// contact required in create (at least name)
const validateContactRequired = body("contact")
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("validation.contactRequired"));
    if (!val.name || typeof val.name !== "string" || val.name.trim().length < 2)
      throw new Error(t("validation.contactName"));
    if (val.customerRef && typeof val.customerRef !== "string")
      throw new Error(t("validation.invalidCustomerRef"));
    if (val.userRef && typeof val.userRef !== "string")
      throw new Error(t("validation.invalidUserRef"));
    return true;
  });

const validateContactOptional = body("contact")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!val || typeof val !== "object") throw new Error(t("validation.contactInvalid"));
    if (val.name && (typeof val.name !== "string" || val.name.trim().length < 2))
      throw new Error(t("validation.contactName"));
    if (val.customerRef && !/^[a-f\d]{24}$/i.test(val.customerRef))
      throw new Error(t("validation.invalidCustomerRef"));
    if (val.userRef && !/^[a-f\d]{24}$/i.test(val.userRef))
      throw new Error(t("validation.invalidUserRef"));
    if (val.email && typeof val.email === "string") {
      // light email check
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.email);
      if (!ok) throw new Error(t("validation.contactEmail"));
    }
    return true;
  });

// services[]
const validateServicesOptional = body("services")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("validation.servicesInvalid"));
    for (const [i, s] of val.entries()) {
      if (!s || typeof s !== "object") throw new Error(t("validation.servicesItemInvalid"));
      if (!s.service || !/^[a-f\d]{24}$/i.test(String(s.service)))
        throw new Error(t("validation.servicesServiceId"));
      if (!s.period || typeof s.period !== "object")
        throw new Error(t("validation.servicesPeriod"));
      const every = Number(s.period.every);
      if (!every || every < 1) throw new Error(t("validation.servicesEvery"));
      if (!PERIOD_UNITS.includes(String(s.period.unit)))
        throw new Error(t("validation.servicesUnit"));
      if (s.period.daysOfWeek) {
        if (!Array.isArray(s.period.daysOfWeek)) throw new Error(t("validation.servicesDOW"));
        for (const d of s.period.daysOfWeek) {
          if (typeof d !== "number" || d < 0 || d > 6)
            throw new Error(t("validation.servicesDOW"));
        }
      }
      if (s.isActive !== undefined && typeof s.isActive !== "boolean")
        throw new Error(t("validation.booleanField"));
    }
    return true;
  });

// fees[]
const validateFeesOptional = body("fees")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
    if (!Array.isArray(val)) throw new Error(t("validation.feesInvalid"));
    for (const f of val) {
      if (!f || typeof f !== "object") throw new Error(t("validation.feesItemInvalid"));
      if (!FEE_TYPES.includes(String(f.type))) throw new Error(t("validation.feesType"));
      if (typeof f.amount !== "number" || f.amount < 0)
        throw new Error(t("validation.feesAmount"));
      if (!f.currency || typeof f.currency !== "string")
        throw new Error(t("validation.feesCurrency"));
      if (!FEE_PERIODS.includes(String(f.period)))
        throw new Error(t("validation.feesPeriod"));
      if (f.isActive !== undefined && typeof f.isActive !== "boolean")
        throw new Error(t("validation.booleanField"));
    }
    return true;
  });

// images: allow body.images OR req.files
const validateImagesRequired = body("images")
  .custom((val, { req }) => {
    if (Array.isArray(val) && val.length > 0) return true;
    if (req.files && Array.isArray(req.files) && req.files.length > 0) return true;
    throw new Error(translate("validation.requiredImages", req.locale || getLogLocale(), translations));
  });

// --- CREATE ---
export const validateCreateApartment = [
  // i18n
  body("title").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("content").optional().customSanitizer(parseIfJson).custom(validateMultilangField),

  // required core
  body("category")
    .notEmpty()
    .withMessage((_, { req }) =>
      translate("validation.requiredCategory", req.locale || getLogLocale(), translations)
    )
    .isMongoId()
    .withMessage((_, { req }) =>
      translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
    ),

  validateImagesRequired,
  validateAddressRequired,
  validateContactRequired,

  // optional relations/meta
  body("customer").optional().isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCustomerRef", req.locale || getLogLocale(), translations)
  ),
  body("slug").optional().isString(),

  // optional complex
  validateLocationOptional,
  validateServicesOptional,
  validateFeesOptional,

  validateRequest,
];

// --- UPDATE ---
export const validateUpdateApartment = [
  body("title").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("content").optional().customSanitizer(parseIfJson).custom(validateMultilangField),

  body("category").optional().isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
  ),
  body("customer").optional().isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCustomerRef", req.locale || getLogLocale(), translations)
  ),

  // optional complex
  validateAddressOptional,
  validateLocationOptional,
  validateContactOptional,
  validateServicesOptional,
  validateFeesOptional,

  // flags
  body("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    translate("validation.booleanField", req.locale || getLogLocale(), translations)
  ),
  body("publishedAt").optional().isISO8601().withMessage((_, { req }) =>
    translate("validation.invalidDate", req.locale || getLogLocale(), translations)
  ),

  // images (optional) — body.images may exist, but usually files come via multer
  body("images").optional().custom(() => true),
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

  validateRequest,
];

// --- Admin list query ---
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) =>
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
  query("city").optional().isString(),
  query("zip").optional().isString(),
  query("q").optional().isString(),
  query("nearLng").optional().isFloat({ min: -180, max: 180 }),
  query("nearLat").optional().isFloat({ min: -90, max: 90 }),
  query("nearRadius").optional().isInt({ min: 10, max: 200000 }), // metre
  validateRequest,
];

// --- Public list query ---
export const validatePublicQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES)
    .withMessage((_, { req }) =>
      translate("validation.invalidLanguage", req.locale || getLogLocale(), translations)
    ),
  query("category").optional().isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidCategory", req.locale || getLogLocale(), translations)
  ),
  query("city").optional().isString(),
  query("zip").optional().isString(),
  query("q").optional().isString(),
  query("nearLng").optional().isFloat({ min: -180, max: 180 }),
  query("nearLat").optional().isFloat({ min: -90, max: 90 }),
  query("nearRadius").optional().isInt({ min: 10, max: 200000 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

// --- Public slug ---
export const validateSlug = [
  param("slug").isString().trim().notEmpty().withMessage((_, { req }) =>
    translate("validation.invalidSlug", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];
