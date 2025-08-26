import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const tReq = (req: any) => (k: string, p?: any) => translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* Common: ObjectId */
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) => tReq(req)("validation.invalidObjectId")),
  validateRequest,
];

/* ====== CREATE ====== */
export const validateCreateBranch = [
  body("code").isString().trim().notEmpty().withMessage((_, { req }) => tReq(req)("validation.codeRequired")),
  body("name").customSanitizer(parseIfJson).custom(validateMultilangField),
  // location required
  body("location")
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      const t = tReq(req);
      if (!val || typeof val !== "object") throw new Error(t("validation.locationRequired"));
      if (val.type && val.type !== "Point") throw new Error(t("validation.locationType"));
      const c = val.coordinates;
      if (!Array.isArray(c) || c.length !== 2) throw new Error(t("validation.locationCoordinates"));
      const [lng, lat] = c;
      if (typeof lng !== "number" || typeof lat !== "number") throw new Error(t("validation.locationCoordinates"));
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) throw new Error(t("validation.locationRange"));
      return true;
    }),
  // services required min 1
  body("services")
    .customSanitizer(parseIfJson)
    .custom((arr, { req }) => {
      const t = tReq(req);
      if (!Array.isArray(arr) || arr.length === 0) throw new Error(t("validation.servicesRequired"));
      const ok = arr.every((s) => ["delivery", "pickup", "dinein"].includes(s));
      if (!ok) throw new Error(t("validation.invalidServiceType"));
      return true;
    }),

  // openingHours optional
  body("openingHours")
    .optional()
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      const t = tReq(req);
      if (!Array.isArray(val)) throw new Error(t("validation.openingHoursInvalid"));
      for (const v of val) {
        if (typeof v !== "object" || v == null) throw new Error(t("validation.openingEntryInvalid"));
        const { day, open, close } = v;
        if (!(Number.isInteger(day) && day >= 0 && day <= 6)) throw new Error(t("validation.openingDayRange"));
        if (!(typeof open === "string" && /^\d{2}:\d{2}$/.test(open))) throw new Error(t("validation.openingTimeFormat"));
        if (!(typeof close === "string" && /^\d{2}:\d{2}$/.test(close))) throw new Error(t("validation.openingTimeFormat"));
      }
      return true;
    }),

  // minPrepMinutes optional
  body("minPrepMinutes")
    .optional()
    .isInt({ min: 0, max: 240 })
    .withMessage((_, { req }) => tReq(req)("validation.minPrepInvalid")),

  // deliveryZones optional
  body("deliveryZones")
    .optional()
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      const t = tReq(req);
      if (!Array.isArray(val)) throw new Error(t("validation.deliveryZonesInvalid"));
      for (const z of val) {
        if (!z || typeof z !== "object") throw new Error(t("validation.deliveryZonesInvalid"));
        if (!z.polygon || z.polygon.type !== "Polygon" || !Array.isArray(z.polygon.coordinates))
          throw new Error(t("validation.zonePolygonInvalid"));
        if (z.fee) {
          if (typeof z.fee.amount !== "number" || z.fee.amount < 0)
            throw new Error(t("validation.zoneFeeInvalidAmount"));
          if (z.fee.currency && !["TRY","EUR","USD"].includes(z.fee.currency))
            throw new Error(t("validation.zoneFeeInvalidCurrency"));
        }
        if (z.name && typeof z.name !== "string") throw new Error(t("validation.zoneNameInvalid"));
      }
      return true;
    }),

  // flags
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  validateRequest,
];

/* ====== UPDATE ====== */
export const validateUpdateBranch = [
  body("code").optional().isString().trim().notEmpty().withMessage((_, { req }) => tReq(req)("validation.codeRequired")),
  body("name").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("location")
    .optional()
    .customSanitizer(parseIfJson)
    .custom((val, { req }) => {
      const t = tReq(req);
      if (!val || typeof val !== "object") throw new Error(t("validation.locationInvalid"));
      if (val.type && val.type !== "Point") throw new Error(t("validation.locationType"));
      const c = val.coordinates;
      if (!Array.isArray(c) || c.length !== 2) throw new Error(t("validation.locationCoordinates"));
      const [lng, lat] = c;
      if (typeof lng !== "number" || typeof lat !== "number") throw new Error(t("validation.locationCoordinates"));
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) throw new Error(t("validation.locationRange"));
      return true;
    }),
  body("services")
    .optional()
    .customSanitizer(parseIfJson)
    .custom((arr, { req }) => {
      const t = tReq(req);
      if (!Array.isArray(arr) || arr.length === 0) throw new Error(t("validation.servicesRequired"));
      const ok = arr.every((s) => ["delivery", "pickup", "dinein"].includes(s));
      if (!ok) throw new Error(t("validation.invalidServiceType"));
      return true;
    }),
  body("openingHours").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    const t = tReq(req);
    if (!Array.isArray(val)) throw new Error(t("validation.openingHoursInvalid"));
    for (const v of val) {
      if (typeof v !== "object" || v == null) throw new Error(t("validation.openingEntryInvalid"));
      const { day, open, close } = v;
      if (!(Number.isInteger(day) && day >= 0 && day <= 6)) throw new Error(t("validation.openingDayRange"));
      if (!(typeof open === "string" && /^\d{2}:\d{2}$/.test(open))) throw new Error(t("validation.openingTimeFormat"));
      if (!(typeof close === "string" && /^\d{2}:\d{2}$/.test(close))) throw new Error(t("validation.openingTimeFormat"));
    }
    return true;
  }),
  body("minPrepMinutes").optional().isInt({ min: 0, max: 240 }).withMessage((_, { req }) => tReq(req)("validation.minPrepInvalid")),
  body("deliveryZones").optional().customSanitizer(parseIfJson).custom((val, { req }) => {
    const t = tReq(req);
    if (!Array.isArray(val)) throw new Error(t("validation.deliveryZonesInvalid"));
    for (const z of val) {
      if (!z || typeof z !== "object") throw new Error(t("validation.deliveryZonesInvalid"));
      if (!z.polygon || z.polygon.type !== "Polygon" || !Array.isArray(z.polygon.coordinates))
        throw new Error(t("validation.zonePolygonInvalid"));
      if (z.fee) {
        if (typeof z.fee.amount !== "number" || z.fee.amount < 0)
          throw new Error(t("validation.zoneFeeInvalidAmount"));
        if (z.fee.currency && !["TRY","EUR","USD"].includes(z.fee.currency))
          throw new Error(t("validation.zoneFeeInvalidCurrency"));
      }
      if (z.name && typeof z.name !== "string") throw new Error(t("validation.zoneNameInvalid"));
    }
    return true;
  }),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  validateRequest,
];

/* ====== Admin list query ====== */
export const validateAdminQuery = [
  query("q").optional().isString(),
  query("service").optional().isIn(["delivery", "pickup", "dinein"]).withMessage((_, { req }) => tReq(req)("validation.invalidServiceType")),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) => tReq(req)("validation.booleanField")),
  query("nearLng").optional().isFloat({ min: -180, max: 180 }),
  query("nearLat").optional().isFloat({ min: -90, max: 90 }),
  query("nearRadius").optional().isInt({ min: 10, max: 200000 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

/* ====== Public list query ====== */
export const validatePublicQuery = [
  query("q").optional().isString(),
  query("service").optional().isIn(["delivery", "pickup", "dinein"]).withMessage((_, { req }) => tReq(req)("validation.invalidServiceType")),
  query("nearLng").optional().isFloat({ min: -180, max: 180 }),
  query("nearLat").optional().isFloat({ min: -90, max: 90 }),
  query("nearRadius").optional().isInt({ min: 10, max: 200000 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
