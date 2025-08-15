// src/modules/apartment/validation.ts
import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

/* ---------------- Helpers ---------------- */
function parseIfJson<T = any>(value: any): T {
  try {
    return typeof value === "string" ? (JSON.parse(value) as T) : (value as T);
  } catch {
    return value as T;
  }
}

const tReq =
  (req: any) =>
  (k: string, p?: any) =>
    translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const isOid = (v: any) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
const isOidArray = (arr: any) => Array.isArray(arr) && arr.every(isOid);

/* ---------------- Common validators ---------------- */
export const validateObjectId = (field: string) => [
  param(field)
    .isMongoId()
    .withMessage((_, { req }) => tReq(req)("validation.invalidObjectId")),
  validateRequest,
];

/* address { city, country } required (create) */
const validateAddressRequired = body("address")
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = tReq(req);
    if (!val || typeof val !== "object") throw new Error(t("validation.addressRequired"));
    if (!val.city || typeof val.city !== "string") throw new Error(t("validation.addressCity"));
    if (!val.country || typeof val.country !== "string")
      throw new Error(t("validation.addressCountry"));
    return true;
  });

/* address optional (update) */
const validateAddressOptional = body("address")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = tReq(req);
    if (!val || typeof val !== "object") throw new Error(t("validation.addressInvalid"));
    if (val.city && typeof val.city !== "string") throw new Error(t("validation.addressCity"));
    if (val.country && typeof val.country !== "string")
      throw new Error(t("validation.addressCountry"));
    return true;
  });

/* location GeoJSON Point optional */
const validateLocationOptional = body("location")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = tReq(req);
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

/* contact required in create (at least name) — userRef KALKTI */
const validateContactRequired = body("contact")
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = tReq(req);
    if (!val || typeof val !== "object") throw new Error(t("validation.contactRequired"));
    if (!val.name || typeof val.name !== "string" || val.name.trim().length < 2)
      throw new Error(t("validation.contactName"));
    if (val.customerRef && typeof val.customerRef !== "string")
      throw new Error(t("validation.invalidCustomerRef"));
    return true;
  });

/* contact optional in update — userRef KALKTI */
const validateContactOptional = body("contact")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = tReq(req);
    if (!val || typeof val !== "object") throw new Error(t("validation.contactInvalid"));
    if (val.name && (typeof val.name !== "string" || val.name.trim().length < 2))
      throw new Error(t("validation.contactName"));
    if (val.customerRef && !isOid(val.customerRef))
      throw new Error(t("validation.invalidCustomerRef"));
    if (val.email && typeof val.email === "string") {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.email);
      if (!ok) throw new Error(t("validation.contactEmail"));
    }
    return true;
  });

/* place optional (v2) */
const validatePlaceOptional = body("place")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = tReq(req);
    if (!val || typeof val !== "object") throw new Error(t("validation.placeInvalid"));
    if (val.neighborhood && !isOid(String(val.neighborhood)))
      throw new Error(t("validation.invalidNeighborhood"));
    if (val.cityCode && typeof val.cityCode !== "string")
      throw new Error(t("validation.cityCodeInvalid"));
    if (val.districtCode && typeof val.districtCode !== "string")
      throw new Error(t("validation.districtCodeInvalid"));
    if (val.zip && typeof val.zip !== "string") throw new Error(t("validation.zipInvalid"));
    return true;
  });

/* snapshots optional (allow neighborhoodName.*) */
const validateSnapshotsOptional = body("snapshots")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((val, { req }) => {
    const t = tReq(req);
    if (!val || typeof val !== "object") throw new Error(t("validation.snapshotsInvalid"));
    const nn = val.neighborhoodName;
    if (nn !== undefined) {
      if (typeof nn !== "object") throw new Error(t("validation.neighborhoodNameInvalid"));
      for (const [lng, v] of Object.entries(nn)) {
        if (!SUPPORTED_LOCALES.includes(lng as SupportedLocale)) continue;
        if (v !== undefined && typeof v !== "string")
          throw new Error(t("validation.neighborhoodNameInvalid"));
      }
    }
    return true;
  });

/* ===== ops (employees & services) optional ===== */
const validateOpsOptional = body("ops")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((ops, { req }) => {
    const t = tReq(req);
    if (!ops || typeof ops !== "object") throw new Error(t("validation.opsInvalid"));

    if (ops.employees !== undefined) {
      if (!isOidArray(ops.employees)) throw new Error(t("validation.opsEmployeesInvalid"));
    }

    if (ops.services !== undefined) {
      if (!Array.isArray(ops.services)) throw new Error(t("validation.opsServicesInvalid"));
      for (const s of ops.services) {
        if (!s || typeof s !== "object") throw new Error(t("validation.opsServiceBindingInvalid"));
        if (!isOid(s.service)) throw new Error(t("validation.opsServiceIdInvalid"));
        if (s.schedulePlan !== undefined && !isOid(s.schedulePlan))
          throw new Error(t("validation.opsSchedulePlanInvalid"));
        if (s.operationTemplate !== undefined && !isOid(s.operationTemplate))
          throw new Error(t("validation.opsOperationTemplateInvalid"));
        if (s.priceListItem !== undefined && !isOid(s.priceListItem))
          throw new Error(t("validation.opsPriceListItemInvalid"));
        if (s.isActive !== undefined && typeof s.isActive !== "boolean")
          throw new Error(t("validation.booleanField"));
        if (s.notes !== undefined && typeof s.notes !== "string")
          throw new Error(t("validation.opsNotesInvalid"));
      }
    }

    if (ops.cleaningPlan !== undefined && !isOid(ops.cleaningPlan))
      throw new Error(t("validation.opsCleaningPlanInvalid"));
    if (ops.trashPlan !== undefined && !isOid(ops.trashPlan))
      throw new Error(t("validation.opsTrashPlanInvalid"));

    if (ops.cashCollectionDay !== undefined) {
      const d = Number(ops.cashCollectionDay);
      if (!Number.isInteger(d) || d < 1 || d > 31)
        throw new Error(t("validation.opsCashCollectionDayInvalid"));
    }

    return true;
  });

/* ===== links optional ===== */
const validateLinksOptional = body("links")
  .optional()
  .customSanitizer(parseIfJson)
  .custom((links, { req }) => {
    const t = tReq(req);
    if (!links || typeof links !== "object") throw new Error(t("validation.linksInvalid"));

    const arrFields = [
      "contracts",
      "billingPlans",
      "invoices",
      "payments",
      "priceLists",
      "operationJobs",
      "operationTemplates",
      "timeEntries",
      "reportDefs",
      "reportRuns",
      "files",
      "contacts",
    ];

    for (const f of arrFields) {
      if (links[f] !== undefined && !isOidArray(links[f])) {
        throw new Error(t("validation.invalidObjectIdArray", { field: f }));
      }
    }
    return true;
  });

/* images: body.images OR req.files */
const validateImagesRequired = body("images").custom((val, { req }) => {
  if (Array.isArray(val) && val.length > 0) return true;
  if (req.files && Array.isArray(req.files) && req.files.length > 0) return true;
  throw new Error(tReq(req)("validation.requiredImages"));
});

/* ---------------- CREATE ---------------- */
export const validateCreateApartment = [
  // i18n
  body("title").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("content").optional().customSanitizer(parseIfJson).custom(validateMultilangField),

  // required core
  validateImagesRequired,
  validateAddressRequired,
  validateContactRequired,

  // optional misc
  body("customer").optional().isMongoId().withMessage((_, { req }) =>
    tReq(req)("validation.invalidCustomerRef")
  ),
  body("slug").optional().isString(),

  // v2 optional blocks
  validateLocationOptional,
  validatePlaceOptional,
  validateSnapshotsOptional,

  // NEW: ops & links
  validateOpsOptional,
  validateLinksOptional,

  validateRequest,
];

/* ---------------- UPDATE ---------------- */
export const validateUpdateApartment = [
  body("title").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("content").optional().customSanitizer(parseIfJson).custom(validateMultilangField),

  body("customer").optional().isMongoId().withMessage((_, { req }) =>
    tReq(req)("validation.invalidCustomerRef")
  ),

  validateAddressOptional,
  validateLocationOptional,
  validateContactOptional,
  validatePlaceOptional,
  validateSnapshotsOptional,

  // NEW: ops & links
  validateOpsOptional,
  validateLinksOptional,

  // flags
  body("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tReq(req)("validation.booleanField")
  ),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tReq(req)("validation.booleanField")
  ),
  body("publishedAt").optional().isISO8601().withMessage((_, { req }) =>
    tReq(req)("validation.invalidDate")
  ),

  // images (optional)
  body("images").optional().custom(() => true),
  body("removedImages")
    .optional()
    .custom((val, { req }) => {
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch {
        const t = tReq(req);
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

/* ---------------- Admin list query (v2) ---------------- */
export const validateAdminQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES as unknown as string[])
    .withMessage((_, { req }) => tReq(req)("validation.invalidLanguage")),
  query("isPublished").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tReq(req)("validation.booleanField")
  ),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_, { req }) =>
    tReq(req)("validation.booleanField")
  ),
  // v2 filters
  query("neighborhood").optional().isMongoId().withMessage((_, { req }) =>
    tReq(req)("validation.invalidNeighborhood")
  ),
  query("cityCode").optional().isString(),
  query("districtCode").optional().isString(),

  // ops filters (NEW)
  query("employee").optional().isMongoId().withMessage((_, { req }) =>
    tReq(req)("validation.invalidObjectId")
  ),
  query("service").optional().isMongoId().withMessage((_, { req }) =>
    tReq(req)("validation.invalidObjectId")
  ),

  // legacy/basic
  query("city").optional().isString(),
  query("zip").optional().isString(),
  query("q").optional().isString(),

  // geo
  query("nearLng").optional().isFloat({ min: -180, max: 180 }),
  query("nearLat").optional().isFloat({ min: -90, max: 90 }),
  query("nearRadius").optional().isInt({ min: 10, max: 200000 }),
  validateRequest,
];

/* ---------------- Public list query (v2) ---------------- */
export const validatePublicQuery = [
  query("language")
    .optional()
    .isIn(SUPPORTED_LOCALES as unknown as string[])
    .withMessage((_, { req }) => tReq(req)("validation.invalidLanguage")),
  query("neighborhood").optional().isMongoId().withMessage((_, { req }) =>
    tReq(req)("validation.invalidNeighborhood")
  ),
  query("cityCode").optional().isString(),
  query("districtCode").optional().isString(),
  query("city").optional().isString(),
  query("zip").optional().isString(),
  query("q").optional().isString(),
  // ops filter (NEW)
  query("service").optional().isMongoId().withMessage((_, { req }) =>
    tReq(req)("validation.invalidObjectId")
  ),
  // geo
  query("nearLng").optional().isFloat({ min: -180, max: 180 }),
  query("nearLat").optional().isFloat({ min: -90, max: 90 }),
  query("nearRadius").optional().isInt({ min: 10, max: 200000 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

/* ---------------- Public slug ---------------- */
export const validateSlug = [
  param("slug").isString().trim().notEmpty().withMessage((_, { req }) =>
    tReq(req)("validation.invalidSlug")
  ),
  validateRequest,
];
