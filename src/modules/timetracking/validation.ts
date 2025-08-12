import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";

// helpers
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

const isISO = (v: any) => typeof v === "string" || v instanceof Date;

const validateGeoPoint = (path: string, optional = true) => {
  const chain = optional ? body(path).optional() : body(path);
  return chain.customSanitizer(parseIfJson).custom((val, { req }) => {
    if (val === undefined || val === null) return true;
    if (typeof val !== "object") throw new Error(translate("validation.invalidGeo", req.locale || getLogLocale(), translations));
    if (val.type && val.type !== "Point") throw new Error(translate("validation.invalidGeoType", req.locale || getLogLocale(), translations));
    const coords = val.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) throw new Error(translate("validation.invalidGeoCoord", req.locale || getLogLocale(), translations));
    const [lng, lat] = coords;
    if (typeof lng !== "number" || typeof lat !== "number" || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error(translate("validation.invalidGeoCoord", req.locale || getLogLocale(), translations));
    }
    return true;
  });
};

const validateBreaks = body("breaks").optional().customSanitizer(parseIfJson).custom((arr, { req }) => {
  if (arr === undefined) return true;
  if (!Array.isArray(arr)) throw new Error(translate("validation.breaksInvalid", req.locale || getLogLocale(), translations));
  for (const b of arr) {
    if (b.start && !isISO(b.start)) throw new Error(translate("validation.dateInvalid", req.locale || getLogLocale(), translations));
    if (b.end && !isISO(b.end)) throw new Error(translate("validation.dateInvalid", req.locale || getLogLocale(), translations));
    if (b.minutes !== undefined && (typeof b.minutes !== "number" || b.minutes < 0))
      throw new Error(translate("validation.numberInvalid", req.locale || getLogLocale(), translations));
    if (b.paid !== undefined && typeof b.paid !== "boolean")
      throw new Error(translate("validation.booleanField", req.locale || getLogLocale(), translations));
  }
  return true;
});

const validatePayCode = body("payCode").optional().customSanitizer(parseIfJson).custom((pc, { req }) => {
  if (!pc) return true;
  const kinds = ["regular","overtime","holiday","sick","vacation","other"];
  if (pc.kind && !kinds.includes(pc.kind)) throw new Error(translate("validation.invalidPayCode", req.locale || getLogLocale(), translations));
  if (pc.billable !== undefined && typeof pc.billable !== "boolean")
    throw new Error(translate("validation.booleanField", req.locale || getLogLocale(), translations));
  return true;
});

const validateRounding = body("rounding").optional().customSanitizer(parseIfJson).custom((r, { req }) => {
  if (!r) return true;
  const strategies = ["nearest","up","down"];
  if (r.roundToMinutes !== undefined && (typeof r.roundToMinutes !== "number" || r.roundToMinutes < 1))
    throw new Error(translate("validation.numberInvalid", req.locale || getLogLocale(), translations));
  if (r.strategy && !strategies.includes(r.strategy))
    throw new Error(translate("validation.invalidRounding", req.locale || getLogLocale(), translations));
  return true;
});

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

// CREATE
export const validateCreateTimeEntry = [
  body("employeeRef").isMongoId().withMessage((_, { req }) =>
    translate("validation.requiredEmployee", req.locale || getLogLocale(), translations)
  ),
  body("date").custom(isISO).withMessage((_, { req }) =>
    translate("validation.dateInvalid", req.locale || getLogLocale(), translations)
  ),

  body("jobRef").optional().isMongoId(),
  body("shiftRef").optional().isMongoId(),
  body("serviceRef").optional().isMongoId(),
  body("apartmentRef").optional().isMongoId(),

  body("clockInAt").optional().custom(isISO),
  body("clockOutAt").optional().custom(isISO)
    .custom((out, { req }) => {
      const t = (k: string) => translate(k, req.locale || getLogLocale(), translations);
      const inc = req.body.clockInAt;
      if (out && inc && new Date(out) < new Date(inc)) throw new Error(t("validation.clockOrder"));
      return true;
    }),

  validateGeoPoint("geoIn"),
  validateGeoPoint("geoOut"),
  body("deviceIn").optional().customSanitizer(parseIfJson).custom(() => true),
  body("deviceOut").optional().customSanitizer(parseIfJson).custom(() => true),

  validateBreaks,
  body("notes").optional().isString(),

  validatePayCode,
  validateRounding,

  body("costRateSnapshot").optional().isFloat({ min: 0 }),
  body("billRateSnapshot").optional().isFloat({ min: 0 }),

  body("minutesWorked").optional().isInt({ min: 0 }),
  body("minutesBreaks").optional().isInt({ min: 0 }),
  body("minutesPaid").optional().isInt({ min: 0 }),
  body("overtimeMinutes").optional().isInt({ min: 0 }),

  body("costAmount").optional().isFloat({ min: 0 }),
  body("billAmount").optional().isFloat({ min: 0 }),

  body("status").optional().isIn(["open","submitted","approved","rejected","locked","exported"])
    .withMessage((_, { req }) => translate("validation.invalidStatus", req.locale || getLogLocale(), translations)),
  body("approvals").optional().customSanitizer(parseIfJson).custom((arr, { req }) => {
    if (arr === undefined) return true;
    if (!Array.isArray(arr)) throw new Error(translate("validation.approvalsInvalid", req.locale || getLogLocale(), translations));
    return true;
  }),

  body("exportBatchId").optional().isString(),
  body("source").optional().isIn(["manual","mobile","kiosk","import","system"]),

  validateRequest,
];

// UPDATE
export const validateUpdateTimeEntry = [
  body("employeeRef").optional().isMongoId(),
  body("date").optional().custom(isISO),

  body("jobRef").optional().isMongoId(),
  body("shiftRef").optional().isMongoId(),
  body("serviceRef").optional().isMongoId(),
  body("apartmentRef").optional().isMongoId(),

  body("clockInAt").optional().custom(isISO),
  body("clockOutAt").optional().custom(isISO)
    .custom((out, { req }) => {
      const inc = req.body.clockInAt ?? (req as any).existingClockInAt;
      if (out && inc && new Date(out) < new Date(inc)) {
        throw new Error(translate("validation.clockOrder", req.locale || getLogLocale(), translations));
      }
      return true;
    }),

  validateGeoPoint("geoIn"),
  validateGeoPoint("geoOut"),
  body("deviceIn").optional().customSanitizer(parseIfJson).custom(() => true),
  body("deviceOut").optional().customSanitizer(parseIfJson).custom(() => true),

  validateBreaks,
  body("notes").optional().isString(),

  validatePayCode,
  validateRounding,

  body("costRateSnapshot").optional().isFloat({ min: 0 }),
  body("billRateSnapshot").optional().isFloat({ min: 0 }),

  body("minutesWorked").optional().isInt({ min: 0 }),
  body("minutesBreaks").optional().isInt({ min: 0 }),
  body("minutesPaid").optional().isInt({ min: 0 }),
  body("overtimeMinutes").optional().isInt({ min: 0 }),

  body("costAmount").optional().isFloat({ min: 0 }),
  body("billAmount").optional().isFloat({ min: 0 }),

  body("status").optional().isIn(["open","submitted","approved","rejected","locked","exported"]),
  body("approvals").optional().customSanitizer(parseIfJson).custom((arr, { req }) => {
    if (arr === undefined) return true;
    if (!Array.isArray(arr)) throw new Error(translate("validation.approvalsInvalid", req.locale || getLogLocale(), translations));
    return true;
  }),

  body("exportBatchId").optional().isString(),
  body("source").optional().isIn(["manual","mobile","kiosk","import","system"]),

  validateRequest,
];

// ADMIN LIST QUERY
export const validateAdminQuery = [
  query("employeeRef").optional().isMongoId(),
  query("jobRef").optional().isMongoId(),
  query("apartmentRef").optional().isMongoId(),
  query("serviceRef").optional().isMongoId(),
  query("status").optional().isIn(["open","submitted","approved","rejected","locked","exported"]),
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
  query("exportBatchId").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  query("sort").optional().isIn(["date","createdAt","updatedAt","clockInAt"]),
  query("order").optional().isIn(["asc","desc"]),
  validateRequest,
];
