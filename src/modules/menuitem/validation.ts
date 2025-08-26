import { body, param, query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { type SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

/* ---------------------------------------------------- */

const parseIfJson = (v: any) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};
const tReq = (req: any) =>
  (k: string, p?: any) =>
    translate(k, (req.locale as SupportedLocale) || getLogLocale(), (translations as any), p);
const oid = (s: any) => typeof s === "string" && /^[a-f\d]{24}$/i.test(s);

/* enums */
const PRICE_KINDS = ["base","deposit","surcharge","discount"] as const;
const CURRENCIES = ["EUR","TRY","USD"] as const;
const CHANNELS   = ["delivery","pickup","dinein"] as const;

/* --- literal union tipleri --- */
type PriceKind = typeof PRICE_KINDS[number];
type Currency  = typeof CURRENCIES[number];
type Channel   = typeof CHANNELS[number];

/* --- type guard & helper'lar --- */
const isPriceKind = (x: unknown): x is PriceKind =>
  typeof x === "string" && (PRICE_KINDS as readonly string[]).includes(x);

const normalizeCurrency = (x: unknown): Currency | undefined => {
  if (typeof x !== "string") return undefined;
  const up = x.toUpperCase();
  return (CURRENCIES as readonly string[]).includes(up) ? (up as Currency) : undefined;
};

const isChannel = (x: unknown): x is Channel =>
  typeof x === "string" && (CHANNELS as readonly string[]).includes(x);

/* ---------- shared validators as functions ---------- */

const validateKVArrayFn = (val: any, { req }: any) => {
  const t = tReq(req);
  const arr = typeof val === "string" ? JSON.parse(val) : val;
  if (!Array.isArray(arr)) throw new Error(t("validation.kvArrayInvalid"));
  for (const it of arr) {
    if (!it || typeof it !== "object") throw new Error(t("validation.kvArrayInvalid"));
    if (!it.key || typeof it.key !== "string") throw new Error(t("validation.kvKeyRequired"));
    if (it.value !== undefined) validateMultilangField(it.value);
  }
  return true;
};

/* categories: string[] veya {category,...}[] kabul et */
const validateCategoriesFn = (val: any, { req }: any) => {
  const t = tReq(req);
  const raw = typeof val === "string" ? JSON.parse(val) : val;
  if (!Array.isArray(raw)) throw new Error(t("validation.categoriesInvalid"));

  const arr = raw.map((c: any) => (typeof c === "string" ? { category: c } : c));

  for (const c of arr) {
    if (!c || typeof c !== "object" || !oid(c.category))
      throw new Error(t("validation.categoryIdInvalid"));
    if (c.order !== undefined && !(Number.isInteger(c.order) && c.order >= 0 && c.order <= 100000))
      throw new Error(t("validation.orderInvalid"));
    if (c.isFeatured !== undefined && typeof c.isFeatured !== "boolean")
      throw new Error(t("validation.booleanField"));
  }
  return true;
};

/* ---------- prices validator: bağlama duyarlı (requireBase) ---------- */
const validatePricesCore = (val: any, { req }: any, requireBase: boolean) => {
  const t = tReq(req);
  const arr = typeof val === "string" ? JSON.parse(val) : val;
  if (!Array.isArray(arr)) throw new Error(t("validation.pricesInvalid"));

  const toNumber = (x: any) => {
    if (typeof x === "number") return x;
    if (typeof x === "string" && x.trim() !== "" && !Number.isNaN(Number(x))) return Number(x);
    return NaN;
  };

  for (const p of arr) {
    if (!p || typeof p !== "object") throw new Error(t("validation.pricesInvalid"));
    if (!isPriceKind(p.kind)) throw new Error(t("validation.priceKindInvalid"));

    const v = p.value;
    if (!v || typeof v !== "object") throw new Error(t("validation.priceValueInvalid"));

    const amt = toNumber(v.amount);
    if (!Number.isFinite(amt) || amt < 0) throw new Error(t("validation.priceValueInvalid"));

    // currency opsiyonel: yoksa TRY kabul et
    const cur = v.currency ? normalizeCurrency(v.currency) : "TRY";
    if (!cur) throw new Error(t("validation.currencyInvalid"));

    if (v.taxIncluded !== undefined && typeof v.taxIncluded !== "boolean")
      throw new Error(t("validation.booleanField"));

    if (p.listRef !== undefined && !oid(p.listRef))
      throw new Error(t("validation.invalidObjectId"));
    if (p.activeFrom !== undefined && isNaN(new Date(p.activeFrom).getTime()))
      throw new Error(t("validation.dateInvalid"));
    if (p.activeTo !== undefined && isNaN(new Date(p.activeTo).getTime()))
      throw new Error(t("validation.dateInvalid"));
    if (p.minQty !== undefined && !(Number.isInteger(p.minQty) && p.minQty >= 0))
      throw new Error(t("validation.minQtyInvalid"));

    if (p.channels !== undefined) {
      const ch = Array.isArray(p.channels) ? p.channels : [p.channels]; // tekil string kabul
      if (ch.some((c: any) => !isChannel(c))) throw new Error(t("validation.channelsInvalid"));
    }

    if (p.outlet !== undefined && typeof p.outlet !== "string")
      throw new Error(t("validation.stringField"));
    if (p.note !== undefined && typeof p.note !== "string")
      throw new Error(t("validation.stringField"));
  }

  if (requireBase && arr.length && !arr.some((p: any) => p?.kind === "base")) {
    throw new Error(t("validation.priceBaseRequired"));
  }
  return true;
};

const validatePricesRequireBase   = (val: any, ctx: any) => validatePricesCore(val, ctx, true);
const validatePricesOptionalBase  = (val: any, ctx: any) => validatePricesCore(val, ctx, false);

/* ---- variants validator (prices entegre; base zorunlu) ---- */
const validateVariantsFn = (val: any, { req }: any) => {
  const t = tReq(req);
  const arr = typeof val === "string" ? JSON.parse(val) : val;
  if (!Array.isArray(arr) || !arr.length) throw new Error(t("validation.variantsInvalid"));

  for (const v of arr) {
    if (!v || typeof v !== "object") throw new Error(t("validation.variantsInvalid"));
    if (!v.code || typeof v.code !== "string")
      throw new Error(t("validation.variantCodeRequired"));
    if (v.order !== undefined && !(Number.isInteger(v.order) && v.order >= 0 && v.order <= 100000))
      throw new Error(t("validation.orderInvalid"));
    if (v.isDefault !== undefined && typeof v.isDefault !== "boolean")
      throw new Error(t("validation.booleanField"));
    if (v.priceListItem !== undefined && !oid(v.priceListItem))
      throw new Error(t("validation.invalidObjectId"));
    if (v.depositPriceListItem !== undefined && !oid(v.depositPriceListItem))
      throw new Error(t("validation.invalidObjectId"));
    if (v.volumeMl !== undefined && !(typeof v.volumeMl === "number" && v.volumeMl >= 0 && v.volumeMl <= 100000))
      throw new Error(t("validation.kvArrayInvalid"));
    if (v.netWeightGr !== undefined && !(typeof v.netWeightGr === "number" && v.netWeightGr >= 0 && v.netWeightGr <= 100000))
      throw new Error(t("validation.kvArrayInvalid"));

    if (v.prices !== undefined) validatePricesRequireBase(v.prices, { req });
  }
  return true;
};

/* ---- modifier groups validator (option.prices; base zorunlu değil) ---- */
const validateModifierGroupsFn = (val: any, { req }: any) => {
  const t = tReq(req);
  const arr = typeof val === "string" ? JSON.parse(val) : val;
  if (!Array.isArray(arr)) throw new Error(t("validation.modifiersInvalid"));

  for (const g of arr) {
    if (!g || typeof g !== "object")
      throw new Error(t("validation.modifierGroupInvalid"));
    if (!g.code || typeof g.code !== "string")
      throw new Error(t("validation.modifierGroupInvalid"));

    if (g.order !== undefined && !(Number.isInteger(g.order) && g.order >= 0 && g.order <= 100000))
      throw new Error(t("validation.orderInvalid"));
    if (g.minSelect !== undefined && !(Number.isInteger(g.minSelect) && g.minSelect >= 0 && g.minSelect <= 100))
      throw new Error(t("validation.modifierGroupInvalid"));
    if (g.maxSelect !== undefined && !(Number.isInteger(g.maxSelect) && g.maxSelect >= 1 && g.maxSelect <= 100))
      throw new Error(t("validation.modifierGroupInvalid"));
    if (g.isRequired !== undefined && typeof g.isRequired !== "boolean")
      throw new Error(t("validation.booleanField"));

    if (!Array.isArray(g.options))
      throw new Error(t("validation.modifierOptionInvalid"));

    for (const o of g.options) {
      if (!o || typeof o !== "object" || !o.code || typeof o.code !== "string")
        throw new Error(t("validation.modifierOptionInvalid"));
      if (o.order !== undefined && !(Number.isInteger(o.order) && o.order >= 0 && o.order <= 100000))
        throw new Error(t("validation.orderInvalid"));
      if (o.isDefault !== undefined && typeof o.isDefault !== "boolean")
        throw new Error(t("validation.booleanField"));
      if (o.priceListItem !== undefined && !oid(o.priceListItem))
        throw new Error(t("validation.invalidObjectId"));

      if (o.prices !== undefined) validatePricesOptionalBase(o.prices, { req });
    }
  }
  return true;
};

const validateDietaryFn = (val: any, { req }: any) => {
  const t = tReq(req);
  const obj = typeof val === "string" ? JSON.parse(val) : val;
  if (!obj || typeof obj !== "object") return true;
  if (obj.spicyLevel !== undefined && !(Number.isInteger(obj.spicyLevel) && obj.spicyLevel >= 0 && obj.spicyLevel <= 3))
    throw new Error(t("validation.spicyInvalid"));
  return true;
};

const validateOpsFn = (val: any, { req }: any) => {
  const t = tReq(req);
  const obj = typeof val === "string" ? JSON.parse(val) : val;
  if (!obj || typeof obj !== "object") return true;
  if (obj.minPrepMinutes !== undefined && !(Number.isInteger(obj.minPrepMinutes) && obj.minPrepMinutes >= 0 && obj.minPrepMinutes <= 240))
    throw new Error(t("validation.minPrepInvalid"));
  if (obj.availableFrom && obj.availableTo) {
    const f = new Date(obj.availableFrom).getTime();
    const to = new Date(obj.availableTo).getTime();
    if (Number.isFinite(f) && Number.isFinite(to) && f > to)
      throw new Error(t("validation.dateRangeInvalid"));
  }
  return true;
};

/* ---------- wrappers (chains) ---------- */
export const validateObjectId = (field: string) => [
  param(field).isMongoId().withMessage((_: any, { req }: any) => tReq(req)("invalidId")),
  validateRequest,
];

/* CREATE */
export const validateCreateMenuItem = [
  body("code").isString().trim().notEmpty().withMessage((_: any, { req }: any) => tReq(req)("validation.codeRequired")),
  body("slug").optional().isString().withMessage((_: any, { req }: any) => tReq(req)("validation.slugInvalid")),
  body("name").customSanitizer(parseIfJson).custom((val, { req }) => {
    const t = tReq(req);
    validateMultilangField(val);
    const hasAny = Object.values(val || {}).some((v) => typeof v === "string" && v.trim().length > 0);
    if (!hasAny) throw new Error(t("validation.nameRequired"));
    return true;
  }),
  body("description").optional().customSanitizer(parseIfJson).custom(validateMultilangField),

  body("categories").optional().custom(validateCategoriesFn),
  body("variants").custom(validateVariantsFn), // required on create
  body("modifierGroups").optional().custom(validateModifierGroupsFn),

  body("allergens").optional().custom(validateKVArrayFn),
  body("additives").optional().custom(validateKVArrayFn),

  body("dietary").optional().custom(validateDietaryFn),
  body("ops").optional().custom(validateOpsFn),

  body("isPublished").optional().toBoolean().isBoolean().withMessage((_: any, { req }: any) => tReq(req)("validation.booleanField")),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_: any, { req }: any) => tReq(req)("validation.booleanField")),

  validateRequest,
];

/* UPDATE */
export const validateUpdateMenuItem = [
  body("code").optional().isString().trim().notEmpty().withMessage((_: any, { req }: any) => tReq(req)("validation.codeRequired")),
  body("slug").optional().isString().withMessage((_: any, { req }: any) => tReq(req)("validation.slugInvalid")),
  body("name").optional().customSanitizer(parseIfJson).custom(validateMultilangField),
  body("description").optional().customSanitizer(parseIfJson).custom(validateMultilangField),

  body("categories").optional().custom(validateCategoriesFn),
  body("variants").optional().custom(validateVariantsFn),
  body("modifierGroups").optional().custom(validateModifierGroupsFn),

  body("allergens").optional().custom(validateKVArrayFn),
  body("additives").optional().custom(validateKVArrayFn),

  body("dietary").optional().custom(validateDietaryFn),
  body("ops").optional().custom(validateOpsFn),

  // hem string[] hem {url, publicId}[] kabul et
  body("removedImages").optional().custom((val, { req }) => {
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (!Array.isArray(parsed)) throw new Error();
      return true;
    } catch {
      throw new Error(tReq(req)("validation.imageRemoveInvalid"));
    }
  }),

  body("isPublished").optional().toBoolean().isBoolean().withMessage((_: any, { req }: any) => tReq(req)("validation.booleanField")),
  body("isActive").optional().toBoolean().isBoolean().withMessage((_: any, { req }: any) => tReq(req)("validation.booleanField")),

  validateRequest,
];

/* Admin/Public list */
export const validateAdminQuery = [
  query("q").optional().isString(),
  query("isActive").optional().toBoolean().isBoolean().withMessage((_: any, { req }: any) => tReq(req)("validation.booleanField")),
  query("isPublished").optional().toBoolean().isBoolean().withMessage((_: any, { req }: any) => tReq(req)("validation.booleanField")),
  query("category").optional().isMongoId().withMessage((_: any, { req }: any) => tReq(req)("validation.categoryIdInvalid")),
  query("vegetarian").optional().toBoolean(),
  query("vegan").optional().toBoolean(),
  query("containsAlcohol").optional().toBoolean(),
  query("service").optional().isIn(["delivery","pickup","dinein"]),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

export const validatePublicQuery = [
  query("q").optional().isString(),
  query("category").optional().isMongoId().withMessage((_: any, { req }: any) => tReq(req)("validation.categoryIdInvalid")),
  query("vegetarian").optional().toBoolean(),
  query("vegan").optional().toBoolean(),
  query("service").optional().isIn(["delivery","pickup","dinein"]),
  query("limit").optional().isInt({ min: 1, max: 500 }),
  validateRequest,
];

export const validateSlug = [
  param("slug").isString().trim().notEmpty().withMessage((_: any, { req }: any) => tReq(req)("validation.slugInvalid")),
  validateRequest,
];
