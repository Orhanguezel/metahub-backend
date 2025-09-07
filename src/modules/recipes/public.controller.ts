import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";

import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/recipes/translate";
import { getLogLocale } from "@/core/utils/i18n/recipes/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/recipes/common";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { llmChat, extractJsonSafe } from "@/services/llm.service";

import {
  hardenTags,
  normalizeTagsLocalized,
  addDerivedTagsIfMissing,
  normalizeCuisines,
  normalizeIngredients,
  normalizeStepsBase,
} from "./utils/content";
import { normalizeTranslatedLabel } from "./utils/i18n";
import { buildSlugPerLocale, pickCanonical } from "./utils/slug";
import { parseIfJson, toStringArray, truthy } from "./utils/parse";

import { PREFERRED_CANONICAL_ORDER } from "./ai.constants";

/* i18n */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const USE_TEXT_SEARCH = process.env.RECIPES_USE_TEXT_SEARCH !== "false";

/* ============ Public Cache Helper ============ */
const setPublicCache = (res: Response) => {
  const maxAge = Number(process.env.RECIPES_PUBLIC_CACHE_MAX_AGE || 60);  // 60s
  const sMaxAge = Number(process.env.RECIPES_PUBLIC_S_MAXAGE || 300);    // 5m
  const swr = Number(process.env.RECIPES_PUBLIC_STALE_WHILE_REVALIDATE || 600); // 10m
  res.setHeader("Cache-Control", `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
};

/* ================= Public List ================= */
export const publicGetRecipes = asyncHandler(async (req, res) => {
  const t = tByReq(req);
  const { Recipe } = await getTenantModels(req);

  const { q, tag, maxTime, limit = "50", fields } =
    req.query as Record<string, string>;
  const now = new Date();

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
    $and: [
      { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: { $lte: now } }] },
      { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }] },
    ],
  };

  const qx = (q || "").trim();
  const tg = (tag || "").trim();
  const useText = !!qx && (process.env.RECIPES_USE_TEXT_SEARCH !== "false") && qx.length >= 2;

  if (useText) {
    filter.$text = { $search: qx };
  } else if (qx) {
    filter.$or = [
      ...SUPPORTED_LOCALES.map((lng) => ({ [`slug.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`title.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`tags.${lng}`]: { $regex: qx, $options: "i" } })),
      { cuisines: { $regex: qx, $options: "i" } },
    ];
  }

  if (tg) {
    const or = SUPPORTED_LOCALES.map((lng) => ({ [`tags.${lng}`]: { $regex: tg, $options: "i" } }));
    filter.$and = [...(filter.$and || []), { $or: or }];
  }
  if (maxTime != null) filter.totalMinutes = { $lte: Number(maxTime) };

  // Varsayılan: TÜM ALANLAR. Sadece ?fields=... verilirse select uygula.
  let query = (Recipe as any)
    .find(filter)
    .sort(
      useText
        ? { score: { $meta: "textScore" }, order: 1, createdAt: -1 }
        : { order: 1, createdAt: -1 }
    )
    .limit(Math.min(Number(limit) || 50, 200))
    .lean(); // public’te populate yok; oluşturulduğu gibi döner

  if (fields && String(fields).trim()) {
    query = query.select(String(fields));
  }

  const list = await query;

  setPublicCache(res);
  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), public: true, resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});


/* ================= Public Detail ================= */
export const publicGetRecipeBySlug = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Recipe } = await getTenantModels(req);
  const { slug } = req.params;

  const now = new Date();
  const loc: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";

  const baseQ: any = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
    $and: [
      { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: { $lte: now } }] },
      { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }] },
    ],
  };

  let doc = await (Recipe as any)
    .findOne({ ...baseQ, [`slug.${loc}`]: String(slug || "").toLowerCase() })
    .select("slug slugCanonical title description images cuisines tags categories servings prepMinutes cookMinutes totalMinutes calories ingredients steps isActive isPublished order createdAt updatedAt effectiveFrom effectiveTo")
    .populate([{ path: "categories", select: "slug name order" }])
    .lean();

  if (!doc) {
    const or = SUPPORTED_LOCALES.map((lng) => ({ [`slug.${lng}`]: String(slug || "").toLowerCase() }));
    doc = await (Recipe as any)
      .findOne({ ...baseQ, $or: or })
      .select("slug slugCanonical title description images cuisines tags categories servings prepMinutes cookMinutes totalMinutes calories ingredients steps isActive isPublished order createdAt updatedAt effectiveFrom effectiveTo")
      .populate([{ path: "categories", select: "slug name order" }])
      .lean();
  }

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  setPublicCache(res);
  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

/* ================= Public Generate & SAVE ================= */
export const aiGeneratePublic = asyncHandler(async (req: Request, res: Response) => {
  const {
    lang: langRaw,
    cuisine,
    vegetarian,
    vegan,
    glutenFree,
    lactoseFree,
    servings,
    maxMinutes,
    includeIngredients,
    excludeIngredients,
    prompt,
  } = (req.body || {}) as Record<string, any>;

  const lang: SupportedLocale = (langRaw as SupportedLocale) || (req.locale as SupportedLocale) || getLogLocale() || "tr";

  // bayraklar
  const dietaryFlags: string[] = [];
  if (truthy(vegetarian)) dietaryFlags.push("vegetarian");
  if (truthy(vegan)) dietaryFlags.push("vegan");
  if (truthy(glutenFree)) dietaryFlags.push("gluten-free");
  if (truthy(lactoseFree)) dietaryFlags.push("lactose-free");

  // listeler
  const includeArr = toStringArray(includeIngredients);
  const excludeArr = toStringArray(excludeIngredients);

  // kriter string’i
  const criteriaParts: string[] = [];
  if (cuisine) criteriaParts.push(`cuisine=${cuisine}`);
  if (dietaryFlags.length) criteriaParts.push(`dietary=[${dietaryFlags.join(", ")}]`);
  if (servings != null && String(servings).trim() !== "") criteriaParts.push(`servings=${servings}`);
  if (maxMinutes != null && String(maxMinutes).trim() !== "") criteriaParts.push(`maxMinutes<=${maxMinutes}`);
  if (includeArr.length) criteriaParts.push(`include=[${includeArr.join(", ")}]`);
  if (excludeArr.length) criteriaParts.push(`exclude=[${excludeArr.join(", ")}]`);
  if (prompt && String(prompt).trim()) criteriaParts.push(`note=${String(prompt).trim()}`);
  const criteriaText = criteriaParts.join("; ");

  if (!criteriaText) { res.status(422).json({ success: false, message: "recipes.error.promptInvalid" }); return; }

  // JSON şema alanlarını 10 dilden dinamik kur
  const jsonFields = SUPPORTED_LOCALES.map((l) => `"${l}":""`).join(",");
  const sys = `Sen usta bir aşçısın. Cevabı ${lang} dilinde ver ama JSON içindeki TÜM çok dilli alanları (${SUPPORTED_LOCALES.join(",")}) doldur.
Aşağıdaki KESİN JSON ŞEMASINA uygun TEK bir JSON nesnesi döndür:
{
  "slug": {${jsonFields}},
  "title": {${jsonFields}},
  "description": {${jsonFields}},
  "cuisines": [],
  "tags": [{${jsonFields}}],
  "servings": 2,
  "prepMinutes": 0,
  "cookMinutes": 0,
  "totalMinutes": 0,
  "calories": 0,
  "ingredients": [ { "name": {${jsonFields}}, "amount": {${jsonFields}} } ],
  "steps": [ { "order": 1, "text": {${jsonFields}} } ],
  "images": []
}
/* Kurallar:
- "servings" kullanıcı isteğiyle eşleşmeli (varsa).
- "totalMinutes" <= "maxMinutes" (varsa). Aşıyorsa gerçekçi minimum ver.
- "cuisines" içine seçilen mutfağı ekle (varsa).
- "tags": mutfak + diyet kısıtları dahil; tüm etiketler ${SUPPORTED_LOCALES.length} dilde.
- "ingredients": 5-12 madde; net ölçü ver (amount çok dilli).
- "steps": 3-8 adım; kısa, uygulanabilir cümleler ve SON ADIM SERVİS/PLATING olsun.
- "exclude" listesini KULLANMA; "include" varsa uygunca EKLE.
- Tüm dil alanlarını doğal çevirilerle doldur; boş bırakma.
*/`;
  const user = `Kriterler: ${criteriaText}`;

  const { Recipe } = await getTenantModels(req);
  const t = tByReq(req);

  const buildAndSave = async (payload: any) => {
    const d: any = extractJsonSafe(payload) || {};

    const title = normalizeTranslatedLabel(d.title || {}, { trim: true });
    const description = normalizeTranslatedLabel(d.description || {}, { trim: true });
    let tags = normalizeTagsLocalized(d.tags || []);

    const ingredients = normalizeIngredients(d.ingredients);
    const steps = normalizeStepsBase(d.steps, { ensureServeStep: true, maxSteps: 8 })!;

    const slugObj = buildSlugPerLocale(d.slug, title);
    const slugCanonical = pickCanonical(slugObj, title);

    let cuisines = Array.isArray(d.cuisines)
      ? d.cuisines.map((x: any) => String(x || "")).map((c) => c.trim()).filter(Boolean)
      : (cuisine ? [String(cuisine).trim()] : []);
    cuisines = cuisines.map((c) => c.toLowerCase()).map((c) => c);

    const derivedTagStrings = [...cuisines, ...dietaryFlags];
    tags = normalizeTagsLocalized(hardenTags(addDerivedTagsIfMissing(tags, derivedTagStrings)));

    const prepMinutes = d.prepMinutes != null ? Number(d.prepMinutes) : undefined;
    const cookMinutes = d.cookMinutes != null ? Number(d.cookMinutes) : undefined;

    let totalMinutes: number | undefined =
      d.totalMinutes != null
        ? Number(d.totalMinutes)
        : (prepMinutes || cookMinutes)
        ? Number(prepMinutes || 0) + Number(cookMinutes || 0)
        : undefined;

    if (maxMinutes != null && Number.isFinite(Number(maxMinutes))) {
      const cap = Number(maxMinutes);
      if (totalMinutes == null || totalMinutes > cap) totalMinutes = cap;
    }

    // ORDER: tenant içinde max(order)+1
    let nextOrder = 1;
    try {
      const last = await (Recipe as any).find({ tenant: req.tenant }).select("order").sort({ order: -1 }).limit(1).lean();
      nextOrder = Math.max(0, Number(last?.[0]?.order || 0)) + 1;
    } catch { nextOrder = 1; }

    const doc = await Recipe.create({
      tenant: req.tenant,
      slug: slugObj,
      slugCanonical,
      order: nextOrder,
      title,
      description,
      images: [],
      cuisines,
      tags,
      categories: [],
      servings: d.servings != null ? Number(d.servings) : (servings != null ? Number(servings) : undefined),
      prepMinutes,
      cookMinutes,
      totalMinutes,
      calories: d.calories != null ? Number(d.calories) : undefined,
      ingredients,
      steps,
      isPublished: true,
      isActive: true,
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id, via: "ai" });
    return doc.toJSON();
  };

  try {
    const raw = await llmChat({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.35,
      // @ts-ignore
      forceJson: true,
    });
    const saved = await buildAndSave(raw);
    res.status(201).json({ success: true, data: saved, message: "recipes.success.generated" });
  } catch (primaryErr: any) {
    try {
      const raw2 = await llmChat({
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        temperature: 0.2,
      });
      const saved2 = await buildAndSave(raw2);
      res.status(201).json({ success: true, data: saved2, message: "recipes.success.generated" });
    } catch (secondaryErr: any) {
      res.status(502).json({
        success: false,
        message: "recipes.error.modelFormat",
        error: String(secondaryErr?.message || primaryErr?.message || "parse_fail"),
      });
    }
  }
});
