import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

const SECTION_KEY_RE = /^[a-zA-Z][a-zA-Z0-9._-]{1,63}$/;
const NAME_RE = /^[a-z][a-z0-9._-]{1,63}$/i;

/** ortak çok-dilli validator */
const mkMultilangValidator = (field: "label" | "description") =>
  body(field)
    .optional()
    .custom((val) => {
      if (val == null) return true;
      if (typeof val === "string") return true; // tek dil string kabul
      if (typeof val !== "object" || Array.isArray(val)) {
        throw new Error(`admin.section.${field}Type`);
      }
      for (const k of Object.keys(val)) {
        if (SUPPORTED_LOCALES.includes(k as SupportedLocale) && typeof (val as any)[k] !== "string") {
          throw new Error(`admin.section.${field}LocaleType`);
        }
      }
      return true;
    });

/** roles string[] kontrolü (opsiyonel) */
const rolesValidator = body("roles")
  .optional()
  .custom((arr) => {
    if (!Array.isArray(arr)) return true;
    if (!arr.every((x) => typeof x === "string")) {
      throw new Error("admin.section.rolesType");
    }
    return true;
  });

/** Public list query (opsiyonel filters) */
export const validatePublicListQuery = [
  query("keys").optional().isString().customSanitizer((v) => String(v).trim()),
  query("zone").optional().isString().matches(NAME_RE),
  query("component").optional().isString().matches(NAME_RE),
  query("components")
    .optional()
    .isString()
    .customSanitizer((v) =>
      String(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",")
    ),
  query("category").optional().isString().matches(NAME_RE),
  validateRequest,
];

/** CREATE */
export const validateCreateSection = [
  body("sectionKey")
    .isString()
    .notEmpty().withMessage("admin.section.keyRequired")
    .matches(SECTION_KEY_RE).withMessage("admin.section.keyPattern"),

  body("zone").optional().isString().matches(NAME_RE),
  body("component").optional().isString().matches(NAME_RE),
  body("category").optional().isString().matches(NAME_RE),

  body("icon").optional().isString(),
  body("variant").optional().isString(),
  body("enabled").optional().isBoolean(),
  body("order").optional().isInt({ min: -1_000_000, max: 1_000_000 }),
  rolesValidator,
  body("params").optional().isObject(),
  body("required").optional().isBoolean(),
  mkMultilangValidator("label"),
  mkMultilangValidator("description"),
  validateRequest,
];

/** UPDATE */
export const validateUpdateSection = [
  body("zone").optional().isString().matches(NAME_RE),
  body("component").optional().isString().matches(NAME_RE),
  body("category").optional().isString().matches(NAME_RE),

  body("icon").optional().isString(),
  body("variant").optional().isString(),
  body("enabled").optional().isBoolean(),
  body("order").optional().isInt({ min: -1_000_000, max: 1_000_000 }),
  rolesValidator,
  body("params").optional().isObject(),
  body("required").optional().isBoolean(),
  mkMultilangValidator("label"),
  mkMultilangValidator("description"),
  validateRequest,
];

/** :sectionKey param */
export const validateSectionKeyParam = [
  param("sectionKey")
    .isString()
    .notEmpty().withMessage("admin.section.sectionKeyParamRequired")
    .matches(SECTION_KEY_RE).withMessage("admin.section.keyPattern"),
  validateRequest,
];
