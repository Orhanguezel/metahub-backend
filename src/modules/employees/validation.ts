import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/utils/validation";

// helpers
const parseIfJson = (v: any) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

const STATUS = ["active","inactive","onleave","terminated"];
const LANG_LEVEL = ["basic","conversational","fluent","native"];
const PAYCODE_KIND = ["standard","overtime","weekend","holiday","service"];

export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_, { req }) =>
    translate("validation.invalidObjectId", req.locale || getLogLocale(), translations)
  ),
  validateRequest,
];

// CREATE
export const validateCreateEmployee = [
  body("code").optional().isString().trim(),
  body("userRef").optional().isMongoId(),

  body("firstName").isString().trim().notEmpty().withMessage((_, { req }) =>
    translate("validation.firstNameRequired", req.locale || getLogLocale(), translations)
  ),
  body("lastName").isString().trim().notEmpty().withMessage((_, { req }) =>
    translate("validation.lastNameRequired", req.locale || getLogLocale(), translations)
  ),

  body("contact").optional().customSanitizer(parseIfJson).custom((val: any) => {
    if (val && typeof val !== "object") throw new Error("invalid contact");
    return true;
  }),

  body("emergency").optional().customSanitizer(parseIfJson).custom((val: any) => {
    if (!val) return true;
    if (typeof val !== "object" || !val.name) throw new Error("invalid emergency");
    return true;
  }),

  body("languages").optional().customSanitizer(parseIfJson).isArray(),
  body("languages.*.code").optional().isString(),
  body("languages.*.level").optional().isIn(LANG_LEVEL),

  body("skills").optional().customSanitizer(parseIfJson).isArray(),
  body("skills.*.key").optional().isString(),

  body("certifications").optional().customSanitizer(parseIfJson).isArray(),

  // employment required
  body("employment").customSanitizer(parseIfJson).custom((val: any, { req }) => {
    if (!val || typeof val !== "object") {
      throw new Error(translate("validation.employmentRequired", req.locale || getLogLocale(), translations));
    }
    if (!["fulltime","parttime","contractor","intern"].includes(String(val.type))) {
      throw new Error("invalid employment.type");
    }
    if (!val.startDate) throw new Error("employment.startDate required");
    return true;
  }),

  body("homeBase").optional().customSanitizer(parseIfJson).custom((v: any) => {
    if (!v) return true;
    if (v.type !== "Point" || !Array.isArray(v.coordinates) || v.coordinates.length !== 2) {
      throw new Error("invalid homeBase");
    }
    return true;
  }),

  body("weeklyAvailability").optional().customSanitizer(parseIfJson).isArray(),
  body("specialDays").optional().customSanitizer(parseIfJson).isArray(),
  body("leaves").optional().customSanitizer(parseIfJson).isArray(),

  body("constraints").optional().customSanitizer(parseIfJson).custom((v: any) => {
    if (v && typeof v !== "object") throw new Error("invalid constraints");
    return true;
  }),

  body("rateCards").optional().customSanitizer(parseIfJson).isArray(),
  body("rateCards.*.kind").optional().isIn(PAYCODE_KIND),
  body("rateCards.*.serviceRef").optional().custom((x: any, { req }) => {
    if (x && !isValidObjectId(x)) throw new Error(translate("validation.invalidObjectId", req.locale || getLogLocale(), translations));
    return true;
  }),
  body("rateCards.*.validFrom").optional().isISO8601(),

  body("status").optional().isIn(STATUS),
  body("notes").optional().customSanitizer(parseIfJson),
  body("tags").optional().customSanitizer(parseIfJson).isArray(),

  validateRequest,
];

// UPDATE
export const validateUpdateEmployee = [
  body("code").optional().isString().trim(),
  body("userRef").optional().isMongoId(),
  body("firstName").optional().isString().trim().notEmpty(),
  body("lastName").optional().isString().trim().notEmpty(),

  body("contact").optional().customSanitizer(parseIfJson),
  body("emergency").optional().customSanitizer(parseIfJson),

  body("languages").optional().customSanitizer(parseIfJson).isArray(),
  body("skills").optional().customSanitizer(parseIfJson).isArray(),
  body("certifications").optional().customSanitizer(parseIfJson).isArray(),

  body("employment").optional().customSanitizer(parseIfJson).custom((val: any) => {
    if (!val) return true;
    if (val.type && !["fulltime","parttime","contractor","intern"].includes(String(val.type))) {
      throw new Error("invalid employment.type");
    }
    return true;
  }),

  body("homeBase").optional().customSanitizer(parseIfJson),
  body("weeklyAvailability").optional().customSanitizer(parseIfJson).isArray(),
  body("specialDays").optional().customSanitizer(parseIfJson).isArray(),
  body("leaves").optional().customSanitizer(parseIfJson).isArray(),
  body("constraints").optional().customSanitizer(parseIfJson),

  body("rateCards").optional().customSanitizer(parseIfJson).isArray(),
  body("status").optional().isIn(STATUS),
  body("notes").optional().customSanitizer(parseIfJson),
  body("tags").optional().customSanitizer(parseIfJson).isArray(),

  body("currentCostPerHour").optional().isFloat({ min: 0 }),
  body("currentBillPerHour").optional().isFloat({ min: 0 }),

  validateRequest,
];

// LIST (admin) filters
export const validateAdminQuery = [
  query("q").optional().isString(),
  query("status").optional().isIn(STATUS),
  query("language").optional().isString(),
  query("skill").optional().isString(),
  query("serviceRef").optional().isMongoId(),
  query("tag").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];
