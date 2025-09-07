import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
// import { Types } from "mongoose"; // kullanılmıyor

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/recipes/translate";
import { getLogLocale } from "@/core/utils/i18n/recipes/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale /*, type TranslatedLabel*/ } from "@/types/recipes/common";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import slugify from "slugify";

import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";

// import { TAG_CANON } from "./ai.constants"; // kullanılmıyor

/* --- utils --- */
import { buildSlugAndCanonical } from "./utils/slug";
import { normalizeTranslatedLabel } from "./utils/i18n";
import { parseIfJson, normalizeOrder, stringifyIdsDeep } from "./utils/parse";
import {
  normalizeTagsInput,
  normalizeCuisines,
  normalizeCategories,
  normalizeIngredients,
  normalizeStepsBase,
} from "./utils/content";

/* i18n */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

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
      slugCanonical: slugCanonicalRaw,
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
    const finalCanonical = (() => {
      const sc = String(slugCanonicalRaw || "").trim();
      return sc ? slugify(sc, { lower: true, strict: true }) : canonical;
    })();

    const doc = await Recipe.create({
      tenant: req.tenant,
      slug: slugObj,
      slugCanonical: finalCanonical,
      order: normalizeOrder(order),

      title: baseTitle,
      description: baseDesc,
      images,

      cuisines: normalizeCuisines(cuisines) || [],
      tags: normalizeTagsInput(tags) || [],
      categories: normalizeCategories(categories) || [],

      servings: servings ? Number(servings) : undefined,
      prepMinutes: prepMinutes ? Number(prepMinutes) : undefined,
      cookMinutes: cookMinutes ? Number(cookMinutes) : undefined,
      totalMinutes: totalMinutes ? Number(totalMinutes) : undefined,
      calories: calories ? Number(calories) : undefined,

      ingredients: normalizeIngredients(ingredients) || [],
      // Admin tarafında serve adımı zorunlu değil; limit yok
      steps: normalizeStepsBase(steps, { ensureServeStep: false }) || [],

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
    slugCanonical: slugCanonicalRaw,
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
  // Eğer açıkça slugCanonical gönderildiyse bunu esas al
  if ((req.body as any).slugCanonical !== undefined) {
    const sc = String((req.body as any).slugCanonical || "").trim();
    if (sc) {
      (doc as any).slugCanonical = slugify(sc, { lower: true, strict: true });
    }
  }

  if (cuisines !== undefined) (doc as any).cuisines = normalizeCuisines(cuisines) || [];
  if (tags !== undefined) (doc as any).tags = normalizeTagsInput(tags) || [];
  if (categories !== undefined) (doc as any).categories = normalizeCategories(categories) || [];
  if (servings !== undefined) (doc as any).servings = servings ? Number(servings) : undefined;
  if (prepMinutes !== undefined) (doc as any).prepMinutes = prepMinutes ? Number(prepMinutes) : undefined;
  if (cookMinutes !== undefined) (doc as any).cookMinutes = cookMinutes ? Number(cookMinutes) : undefined;
  if (totalMinutes !== undefined) (doc as any).totalMinutes = totalMinutes ? Number(totalMinutes) : undefined;
  if (calories !== undefined) (doc as any).calories = calories ? Number(calories) : undefined;
  if (ingredients !== undefined) (doc as any).ingredients = normalizeIngredients(ingredients) || [];
  if (steps !== undefined) (doc as any).steps = normalizeStepsBase(steps, { ensureServeStep: false }) || [];
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
export const adminGetAllRecipes = asyncHandler(async (req, res) => {
  const t = tByReq(req);
  const { Recipe } = await getTenantModels(req);

  const { q, isActive, isPublished, category, limit = "200", fields } =
    req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };
  if (isActive != null)   filter.isActive = isActive === "true";
  if (isPublished != null) filter.isPublished = isPublished === "true";
  if (category)          filter.categories = category;

  const qx = (q || "").trim();
  const USE_TEXT = process.env.RECIPES_USE_TEXT_SEARCH !== "false";
  const useText = !!qx && USE_TEXT && qx.length >= 2;

  if (useText) {
    filter.$text = { $search: qx };
  } else if (qx) {
    filter.$or = [
      ...SUPPORTED_LOCALES.map((lng) => ({ [`slug.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`title.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`description.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`tags.${lng}`]: { $regex: qx, $options: "i" } })),
      { cuisines: { $regex: qx, $options: "i" } },
    ];
  }

  // Varsayılan: TÜM ALANLAR. Sadece ?fields=... verilirse select uygula.
  let query = (Recipe as any)
    .find(filter)
    .populate([{ path: "categories", select: "slug name order" }])
    .sort(
      useText
        ? { score: { $meta: "textScore" }, order: 1, createdAt: -1 }
        : { order: 1, createdAt: -1 }
    )
    .limit(Math.min(Number(limit) || 200, 500))
    .lean({ virtuals: true, getters: true });

  if (fields && String(fields).trim()) {
    query = query.select(String(fields));
  }

  const list = await query;
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
