import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { Types } from "mongoose";

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/recipes/translate";
import { getLogLocale } from "@/core/utils/i18n/recipes/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale, type TranslatedLabel } from "@/types/recipes/common";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { fillAllLocales } from "@/core/utils/i18n/recipes/fillAllLocales";
import slugify from "slugify";

import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";

import {
  PREFERRED_CANONICAL_ORDER,
  TAG_CANON,
  canonicalizeCuisine,
} from "./ai.constants";

/* i18n */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* ===== helpers (genel) ===== */
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

const stringifyIdsDeep = (obj: any): any => {
  if (obj == null) return obj;
  if (obj instanceof Types.ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyIdsDeep);
  if (typeof obj === "object") { for (const k of Object.keys(obj)) obj[k] = stringifyIdsDeep(obj[k]); return obj; }
  return obj;
};

const normalizeOrder = (raw: any) => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100000, n));
};

const toStringArray = (raw: any): string[] => {
  const v = parseIfJson(raw);
  if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);
  if (v == null || v === "") return [];
  return String(v).split(",").map((x) => x.trim()).filter(Boolean);
};

/** Çok dilli alan normalize (trim + isteğe bağlı lowercase) */
const normalizeTranslatedLabel = (
  input: any,
  opts?: { lowercase?: boolean; trim?: boolean }
): TranslatedLabel => {
  const filled = fillAllLocales(input || {});
  const out = {} as TranslatedLabel;
  for (const lng of SUPPORTED_LOCALES) {
    let v = String((filled as any)[lng] || "").replace(/\s+/g, " ");
    if (opts?.trim !== false) v = v.trim();
    if (opts?.lowercase) v = v.toLowerCase();
    (out as any)[lng] = v;
  }
  return out;
};

/** Küçük yazım/boşluk düzeltmeleri — dil agnostik, tip güvenli */
function fixCommonTyposLabel(label: TranslatedLabel): TranslatedLabel {
  const out = { ...label };
  for (const lng of SUPPORTED_LOCALES) {
    let v = String((out as any)[lng] || "");
    v = v.replace(/\s{2,}/g, " ").replace(/ ?– ?/g, " - ").trim();
    (out as any)[lng] = v;
  }
  return out;
}

/** tags: string[] | TranslatedLabel[] → normalize + dedupe + sertleştir */
const normalizeTags = (raw: any): TranslatedLabel[] | undefined => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;

  // temel normalize
  let tags: TranslatedLabel[] = arr.map((t: any) =>
    normalizeTranslatedLabel(t && typeof t === "object" ? t : { tr: String(t || "") }, {
      lowercase: true,
      trim: true,
    })
  );

  // sözlükle sertleştir
  tags = tags.map((t) => {
    const key = slugify(String((t as any).en || (t as any).tr || Object.values(t)[0] || ""), { lower: true, strict: true });
    return (TAG_CANON as any)[key] ? (TAG_CANON as any)[key] : t;
  });

  // dedupe
  const seen = new Set<string>();
  const out: TranslatedLabel[] = [];
  for (const t of tags) {
    const keySource =
      ((t as any).en && (t as any).en.trim()) ||
      ((t as any).tr && (t as any).tr.trim()) ||
      (Object.values(t).find((x) => String(x).trim()) as string) ||
      "";
    const key = slugify(keySource, { lower: true, strict: true });
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
};

/** categories: ObjectId[] */
const normalizeCategories = (raw: any) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;
  return arr.filter((id: any) => Types.ObjectId.isValid(id));
};

/** cuisines: string[] → kanonik + dedupe (italian, turkish, ...) */
const normalizeCuisines = (raw: any) => {
  const list = toStringArray(raw).map(canonicalizeCuisine);
  const set = new Set(list.filter(Boolean));
  return Array.from(set);
};

/** amount/slug için güvenli yardımcılar */
const safeSlug = (raw: any, fallback?: string) => {
  const s = slugify(String(raw || ""), { lower: true, strict: true });
  const ok = s && !/^\d+$/.test(s);
  return ok ? s : (fallback ? slugify(fallback, { lower: true, strict: true }) : "");
};

/** ingredients: name & amount çok dilli, order 0..N */
const normalizeIngredients = (raw: any, _loc: SupportedLocale) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;
  const mapped = arr.map((i: any, idx: number) => {
    const name = fixCommonTyposLabel(normalizeTranslatedLabel(parseIfJson(i?.name) || {}, { trim: true }));
    // amount hem string hem object gelebilir → 10 dile yay
    let amount: TranslatedLabel | undefined;
    if (i?.amount != null) {
      if (typeof i.amount === "object") {
        amount = fixCommonTyposLabel(normalizeTranslatedLabel(parseIfJson(i.amount) || {}, { trim: true }));
      } else {
        const s = String(i.amount);
        amount = fixCommonTyposLabel(normalizeTranslatedLabel({ tr: s, en: s }, { trim: true }));
      }
    }
    const order = Number.isInteger(i?.order) ? i.order : idx;
    return { name, amount, order };
  });
  mapped.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  return mapped.map((i: any, idx: number) => ({ ...i, order: idx })); // 0..N
};

/** steps: text fill, order 1..N */
const normalizeSteps = (raw: any, _loc: SupportedLocale) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;
  const mapped = arr
    .map((s: any, idx: number) => ({
      order: Number.isInteger(s?.order) ? s.order : idx + 1,
      text: fixCommonTyposLabel(normalizeTranslatedLabel(parseIfJson(s?.text) || {}, { trim: true })),
    }))
    .filter((s: any) => Object.values(s.text).some((v) => String(v).trim().length > 0));
  mapped.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  return mapped.map((s: any, idx: number) => ({ ...s, order: idx + 1 })); // 1..N
};

/** slug: string | TranslatedLabel → TranslatedLabel + canonical (10 dil önceliği) */
const buildSlugAndCanonical = (slugInput: any, titleObj: TranslatedLabel) => {
  const slugObj = {} as TranslatedLabel;
  const fallback = (titleObj?.en || titleObj?.tr || "").trim();
  for (const lng of SUPPORTED_LOCALES) {
    const raw = (slugInput && typeof slugInput === "object" && (slugInput as any)[lng])
      ? (slugInput as any)[lng]
      : (titleObj?.[lng] || "");
    (slugObj as any)[lng] = safeSlug(raw, fallback) || safeSlug(fallback);
  }
  let canonical = "";
  for (const lng of PREFERRED_CANONICAL_ORDER) {
    const pick = (slugObj as any)[lng] || (fallback ? safeSlug(fallback) : "");
    if (pick) { canonical = pick; break; }
  }
  if (!canonical) canonical = `recipe-${Date.now()}`;
  return { slugObj, canonical };
};

/* ================ CREATE ================ */
export const createRecipe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Recipe } = await getTenantModels(req);

  try {
    const files: Express.Multer.File[] = (req.files as any) || [];

    const {
      slug, title, description,
      cuisines, tags, categories,
      servings, prepMinutes, cookMinutes, totalMinutes, calories,
      ingredients, steps,
      effectiveFrom, effectiveTo,
      isPublished, isActive,
      order,
    } = req.body || {};

    const baseTitle = normalizeTranslatedLabel(parseIfJson(title), { trim: true });
    const baseDesc  = normalizeTranslatedLabel(parseIfJson(description), { trim: true });

    // images
    const images: any[] = [];
    for (const file of files) {
      const imageUrl = getImagePath(file);
      if (!imageUrl) continue;
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
    }

    const { slugObj, canonical } = buildSlugAndCanonical(parseIfJson(slug), baseTitle);

    const doc = await Recipe.create({
      tenant: req.tenant,
      slug: slugObj,
      slugCanonical: canonical,
      order: normalizeOrder(order),

      title: baseTitle,
      description: baseDesc,
      images,

      cuisines: normalizeCuisines(cuisines) || [],
      tags: normalizeTags(tags) || [],
      categories: normalizeCategories(categories) || [],

      servings: servings ? Number(servings) : undefined,
      prepMinutes: prepMinutes ? Number(prepMinutes) : undefined,
      cookMinutes: cookMinutes ? Number(cookMinutes) : undefined,
      totalMinutes: totalMinutes ? Number(totalMinutes) : undefined,
      calories: calories ? Number(calories) : undefined,

      ingredients: normalizeIngredients(ingredients, (req.locale as any) || "tr") || [],
      steps: normalizeSteps(steps, (req.locale as any) || "tr") || [],

      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      effectiveTo:   effectiveTo ? new Date(effectiveTo) : undefined,

      isPublished: isPublished === undefined ? true : (isPublished === "true" || isPublished === true),
      isActive:    isActive === undefined ? true : (isActive === "true" || isActive === true),
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id, images: images.length });
    res.status(201).json({ success: true, message: t("created"), data: doc.toJSON() });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), { ...getRequestContext(req), event: "recipe.create", error: err?.message });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

/* ================ UPDATE ================ */
export const updateRecipe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  const { Recipe } = await getTenantModels(req);
  const doc = await Recipe.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const files: Express.Multer.File[] = (req.files as any) || [];

  const {
    slug, title, description,
    cuisines, tags, categories,
    servings, prepMinutes, cookMinutes, totalMinutes, calories,
    ingredients, steps,
    effectiveFrom, effectiveTo,
    isPublished, isActive,
    removedImages,
    order,
  } = req.body || {};

  if (title !== undefined) (doc as any).title = normalizeTranslatedLabel(parseIfJson(title), { trim: true });
  if (description !== undefined) (doc as any).description = normalizeTranslatedLabel(parseIfJson(description), { trim: true });

  if (slug !== undefined) {
    const built = buildSlugAndCanonical(parseIfJson(slug), (doc as any).title);
    (doc as any).slug = built.slugObj;
    (doc as any).slugCanonical = built.canonical;
  } else {
    const built = buildSlugAndCanonical((doc as any).slug, (doc as any).title);
    (doc as any).slug = built.slugObj;
    (doc as any).slugCanonical = built.canonical;
  }

  if (cuisines !== undefined) (doc as any).cuisines = normalizeCuisines(cuisines) || [];
  if (tags !== undefined) (doc as any).tags = normalizeTags(tags) || [];
  if (categories !== undefined) (doc as any).categories = normalizeCategories(categories) || [];
  if (servings !== undefined) (doc as any).servings = servings ? Number(servings) : undefined;
  if (prepMinutes !== undefined) (doc as any).prepMinutes = prepMinutes ? Number(prepMinutes) : undefined;
  if (cookMinutes !== undefined) (doc as any).cookMinutes = cookMinutes ? Number(cookMinutes) : undefined;
  if (totalMinutes !== undefined) (doc as any).totalMinutes = totalMinutes ? Number(totalMinutes) : undefined;
  if (calories !== undefined) (doc as any).calories = calories ? Number(calories) : undefined;
  if (ingredients !== undefined) (doc as any).ingredients = normalizeIngredients(ingredients, (req.locale as any) || "tr") || [];
  if (steps !== undefined) (doc as any).steps = normalizeSteps(steps, (req.locale as any) || "tr") || [];
  if (effectiveFrom !== undefined) (doc as any).effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : undefined;
  if (effectiveTo !== undefined) (doc as any).effectiveTo = effectiveTo ? new Date(effectiveTo) : undefined;
  if (isPublished !== undefined) (doc as any).isPublished = (isPublished === "true" || isPublished === true);
  if (isActive !== undefined) (doc as any).isActive = (isActive === "true" || isActive === true);
  if (order !== undefined) (doc as any).order = normalizeOrder(order) ?? (doc as any).order;

  // add images
  if (files.length > 0) {
    for (const file of files) {
      const imageUrl = getImagePath(file);
      if (!imageUrl) continue;
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      (doc as any).images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
    }
  }

  // remove images
  if (removedImages) {
    try {
      const removed: string[] = typeof removedImages === "string" ? JSON.parse(removedImages) : removedImages;
      if (!Array.isArray(removed)) throw new Error("invalid");
      const targetObjs = (doc as any).images.filter((img: any) => removed.includes(img.url));
      (doc as any).images = (doc as any).images.filter((img: any) => !removed.includes(img.url));

      for (const imgObj of targetObjs) {
        const localPath = path.join("uploads", req.tenant, "recipe-images", path.basename(imgObj.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (imgObj.publicId) { try { await cloudinary.uploader.destroy(imgObj.publicId); } catch {} }
      }
    } catch {
      res.status(400).json({ success: false, message: t("validation.imagesRemoveInvalid") }); return;
    }
  }

  await (doc as any).save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id: (doc as any)._id });
  res.status(200).json({ success: true, message: t("updated"), data: (doc as any).toJSON() });
});

/* ================ LIST (admin) ================ */
export const adminGetAllRecipes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Recipe } = await getTenantModels(req);

  const { q, isActive, isPublished, category, limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: req.tenant };

  if (isActive != null) filter.isActive = isActive === "true";
  if (isPublished != null) filter.isPublished = isPublished === "true";
  if (category) filter.categories = category;

  if (q && q.trim()) {
    const qx = q.trim();
    filter.$or = [
      ...SUPPORTED_LOCALES.map((lng) => ({ [`slug.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`title.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`description.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`tags.${lng}`]: { $regex: qx, $options: "i" } })),
      { cuisines: { $regex: qx, $options: "i" } },
    ];
  }

  const list = await (Recipe as any)
    .find(filter)
    .populate([{ path: "categories", select: "slug name order" }])
    .select("tenant slug slugCanonical title images order categories isActive isPublished totalMinutes servings calories createdAt updatedAt")
    .sort({ order: 1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean({ virtuals: true, getters: true });

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: stringifyIdsDeep(list) });
});

/* ================ GET BY ID (admin) ================ */
export const adminGetRecipeById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Recipe } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await (Recipe as any)
    .findOne({ _id: id, tenant: req.tenant })
    .populate([{ path: "categories", select: "slug name order" }])
    .lean();

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }
  res.status(200).json({ success: true, message: t("fetched"), data: stringifyIdsDeep(doc) });
});

/* ================ DELETE ================ */
export const deleteRecipe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Recipe } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await Recipe.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  for (const img of (doc as any).images || []) {
    const localPath = path.join("uploads", req.tenant, "recipe-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if ((img as any).publicId) { try { await cloudinary.uploader.destroy((img as any).publicId); } catch {} }
  }

  await (doc as any).deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
