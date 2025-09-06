import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";
import { t as translate } from "@/core/utils/i18n/recipes/translate";
import { getLogLocale } from "@/core/utils/i18n/recipes/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/recipes/common";
import translations from "./i18n";

const tReq = (req: any) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

const orderValidator = (val: any, { req }: any) => {
  if (val === undefined || val === null || val === "") return true;
  const n = Number(val);
  if (!Number.isFinite(n) || Math.round(n) !== n || n < 0 || n > 100000)
    throw new Error(tReq(req)("validation.orderInvalid"));
  return true;
};

const stepsValidator = (val: any, { req }: any) => {
  const t = tReq(req);
  const arr = typeof val === "string" ? parseIfJson(val) : val;
  if (!Array.isArray(arr) || arr.length === 0) throw new Error(t("validation.stepsInvalid"));
  for (const s of arr) {
    if (!s || typeof s !== "object") throw new Error(t("validation.stepsInvalid"));
    if (!(Number.isInteger(s.order) && s.order >= 1 && s.order <= 100000))
      throw new Error(t("validation.stepOrderInvalid"));
    validateMultilangField(s.text);
  }
  return true;
};

const ingredientsValidator = (val: any, { req }: any) => {
  const t = tReq(req);
  const arr = typeof val === "string" ? parseIfJson(val) : val;
  if (!Array.isArray(arr) || arr.length === 0) throw new Error(t("validation.ingredientsInvalid"));
  for (const it of arr) {
    if (!it || typeof it !== "object") throw new Error(t("validation.ingredientsInvalid"));
    validateMultilangField(it.name);
    // amount artık çok dilli — opsiyonel; verilirse doğrula.
    if (it.amount != null) {
      if (typeof it.amount === "object") {
        validateMultilangField(it.amount);
      } else if (typeof it.amount === "string") {
        // string kabul (geri uyum) — normalize katmanı 10 dile yayacak
        if (it.amount.trim().length === 0) throw new Error(t("validation.ingredientsInvalid"));
      } else {
        throw new Error(t("validation.ingredientsInvalid"));
      }
    }
    if (it.order != null) {
      const n = Number(it.order);
      if (!Number.isFinite(n) || Math.round(n) !== n || n < 0 || n > 100000)
        throw new Error(t("validation.orderInvalid"));
    }
  }
  return true;
};

const categoriesValidator = (val: any, { req }: any) => {
  if (val == null || val === "") return true; // opsiyonel
  const t = tReq(req);
  let arr = val;
  try { arr = typeof val === "string" ? JSON.parse(val) : val; } catch { arr = null; }
  if (!Array.isArray(arr)) throw new Error(t("validation.categoriesInvalid"));
  for (const id of arr) {
    if (!(typeof id === "string" && /^[a-f\d]{24}$/i.test(id)))
      throw new Error(t("validation.categoryIdInvalid"));
  }
  return true;
};

/** slug: hem string hem object kabul. Obje ise çok dilliliği doğrula. */
const slugValidator = (val: any, { req }: any) => {
  const v = parseIfJson(val);
  if (v == null || v === "") return true;
  if (typeof v === "string") return true;
  if (typeof v === "object") {
    validateMultilangField(v);
    return true;
  }
  throw new Error(tReq(req)("validation.slugInvalid"));
};

/* ---- CREATE ---- */
export const validateCreateRecipe = [
  body("slug").optional().custom(slugValidator),
  body("order").optional().custom(orderValidator),

  body("title").customSanitizer(parseIfJson).custom((val, { req }) => {
    validateMultilangField(val);
    const hasAny = Object.values(val || {}).some((v) => typeof v === "string" && v.trim().length > 0);
    if (!hasAny) throw new Error(tReq(req)("validation.titleRequired"));
    return true;
  }),

  body("description").optional().customSanitizer(parseIfJson).custom(validateMultilangField),

  body("ingredients").custom(ingredientsValidator),
  body("steps").custom(stepsValidator),

  body("cuisines").optional().customSanitizer(parseIfJson),
  body("tags").optional().customSanitizer(parseIfJson), // çok dilli tag’ler; admin’de esnek bırakıyoruz
  body("categories").optional().custom(categoriesValidator),

  body("servings").optional().isInt({ min: 1 }).withMessage((_, { req }) => tReq(req)("validation.servingsInvalid")),
  body("prepMinutes").optional().isInt({ min: 0 }).withMessage((_, { req }) => tReq(req)("validation.timesInvalid")),
  body("cookMinutes").optional().isInt({ min: 0 }).withMessage((_, { req }) => tReq(req)("validation.timesInvalid")),
  body("totalMinutes").optional().isInt({ min: 0 }).withMessage((_, { req }) => tReq(req)("validation.timesInvalid")),
  body("calories").optional().isInt({ min: 0 }).withMessage((_, { req }) => tReq(req)("validation.caloriesInvalid")),

  body("effectiveFrom").optional().isISO8601(),
  body("effectiveTo").optional().isISO8601(),

  validateRequest,
];

/* ---- UPDATE ---- */
export const validateUpdateRecipe = [
  body("slug").optional().custom(slugValidator),
  body("order").optional().custom(orderValidator),

  body("title").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("description").optional().customSanitizer(parseIfJson).custom(validateMultilangField),

  body("ingredients").optional().custom(ingredientsValidator),
  body("steps").optional().custom(stepsValidator),

  body("cuisines").optional().customSanitizer(parseIfJson),
  body("tags").optional().customSanitizer(parseIfJson),
  body("categories").optional().custom(categoriesValidator),

  body("servings").optional().isInt({ min: 1 }).withMessage((_, { req }) => tReq(req)("validation.servingsInvalid")),
  body("prepMinutes").optional().isInt({ min: 0 }).withMessage((_, { req }) => tReq(req)("validation.timesInvalid")),
  body("cookMinutes").optional().isInt({ min: 0 }).withMessage((_, { req }) => tReq(req)("validation.timesInvalid")),
  body("totalMinutes").optional().isInt({ min: 0 }).withMessage((_, { req }) => tReq(req)("validation.timesInvalid")),
  body("calories").optional().isInt({ min: 0 }).withMessage((_, { req }) => tReq(req)("validation.caloriesInvalid")),

  body("removedImages").optional().custom((val, { req }) => {
    try { const p = typeof val === "string" ? JSON.parse(val) : val; if (!Array.isArray(p)) throw new Error(); return true; }
    catch { throw new Error(tReq(req)("validation.imagesRemoveInvalid")); }
  }),

  validateRequest,
];

/* ---- Admin list ---- */
export const validateAdminQuery = [
  query("q").optional().isString(),
  query("isActive").optional().toBoolean().isBoolean(),
  query("isPublished").optional().toBoolean().isBoolean(),
  query("category").optional().isMongoId(),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

/* ---- Public list ---- */
export const validatePublicQuery = [
  query("q").optional().isString(),
  query("tag").optional().isString(),
  query("maxTime").optional().isInt({ min: 0, max: 100000 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  validateRequest,
];

/* ---- Slug (param) ---- */
export const validateSlug = [
  param("slug").isString().trim().notEmpty().withMessage((_, { req }) => tReq(req)("validation.slugInvalid")),
  validateRequest,
];
