import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";

import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/recipes/translate";
import { getLogLocale } from "@/core/utils/i18n/recipes/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale, type TranslatedLabel } from "@/types/recipes/common";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { llmChat, extractJsonSafe } from "@/services/llm.service";
import { fillAllLocales } from "@/core/utils/i18n/recipes/fillAllLocales";

import {
  PREFERRED_CANONICAL_ORDER,
  SERVE_TEXT,
  SERVE_CUES,
  TAG_CANON,
  canonicalizeCuisine,
} from "./ai.constants";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* ================= Helpers ================= */

const truthy = (v: any) =>
  v === true || v === "true" || v === 1 || v === "1" || v === "on" || v === "yes";

/** "['a','b']" | "a,b" | ["a","b"] -> ["a","b"] */
const toStringArray = (raw: any): string[] => {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || "").trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) return parsed.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {}
  return String(raw).split(",").map((x) => x.trim()).filter(Boolean);
};

/** Çok dilli bir alanı normalize eder */
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

/** Basit yazım/boşluk düzeltmeleri — dil bağımsız, tip güvenli */
function fixCommonTyposLabel(label: TranslatedLabel): TranslatedLabel {
  const out = { ...label };
  for (const lng of SUPPORTED_LOCALES) {
    let v = String((out as any)[lng] || "");
    v = v.replace(/\s{2,}/g, " ").replace(/ ?– ?/g, " - ").trim();
    (out as any)[lng] = v;
  }
  return out;
}

/** Cümle sonu noktalaması yoksa ekle (dil bazlı) */
function punctuateLabel(label: TranslatedLabel): TranslatedLabel {
  const out = { ...label };
  for (const lng of SUPPORTED_LOCALES) {
    let v = String((out as any)[lng] || "").trim();
    if (!v) continue;
    const hasEnd = /[.!?…。؟]|।\s*$/.test(v);
    if (!hasEnd) {
      const end =
        lng === "zh" ? "。" :
        lng === "hi" ? "।" :
        lng === "ar" ? "." :
        ".";
      v = v + end;
    }
    (out as any)[lng] = v;
  }
  return out;
}

/** Tag dizisini normalize + dedupe eder */
const normalizeTagsLocalized = (tags: any): TranslatedLabel[] => {
  const arr = Array.isArray(tags) ? tags : [];
  const normed: TranslatedLabel[] = arr.map((t) =>
    normalizeTranslatedLabel(t && typeof t === "object" ? t : { tr: String(t || "") }, {
      lowercase: true,
      trim: true,
    })
  );
  const seen = new Set<string>();
  const out: TranslatedLabel[] = [];
  for (const t of normed) {
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

/** Varolan tag’lere string türev etiket ekle (cuisine/dietary) */
const addDerivedTagsIfMissing = (base: TranslatedLabel[], derivedStrings: string[]): TranslatedLabel[] => {
  const existingKeys = new Set(
    base.map((o) => slugify(String((o as any).en || (o as any).tr || Object.values(o || {})[0] || ""), { lower: true, strict: true }))
  );
  const out = [...base];
  for (const s of derivedStrings.map((x) => String(x || "").trim()).filter(Boolean)) {
    const key = slugify(s, { lower: true, strict: true });
    if (!key || existingKeys.has(key)) continue;
    out.push(normalizeTranslatedLabel({ tr: s, en: s }, { lowercase: true }));
    existingKeys.add(key);
  }
  return out;
};

const safeSlug = (raw: any, fallback?: string) => {
  const s = slugify(String(raw || ""), { lower: true, strict: true });
  const ok = s && !/^\d+$/.test(s);
  return ok ? s : (fallback ? slugify(fallback, { lower: true, strict: true }) : "");
};

const buildSlugPerLocale = (slugObj: any, title: TranslatedLabel) => {
  const out = {} as TranslatedLabel;
  const fallback = (title?.en || title?.tr || "").trim();
  for (const lng of SUPPORTED_LOCALES) {
    const raw = (slugObj && (slugObj as any)[lng]) ? (slugObj as any)[lng] : (title?.[lng] || "");
    (out as any)[lng] = safeSlug(raw, fallback) || safeSlug(fallback);
  }
  return out;
};

const pickCanonical = (slugObj: TranslatedLabel, title: TranslatedLabel) => {
  for (const l of PREFERRED_CANONICAL_ORDER) {
    const v = (slugObj as any)?.[l] || (title?.[l] ? slugify(String(title[l]), { lower: true, strict: true }) : "");
    if (v) return v;
  }
  return `recipe-${Date.now()}`;
};

/** Ingredients normalize — amount da çok dilli */
const normalizeIngredients = (list: any[]): { name: TranslatedLabel; amount?: TranslatedLabel; order: number }[] => {
  if (!Array.isArray(list)) return [];
  return list
    .map((i, idx) => {
      const name = fixCommonTyposLabel(normalizeTranslatedLabel((i?.name || {}), { trim: true }));
      let amount: TranslatedLabel | undefined;
      if (i?.amount != null) {
        if (typeof i.amount === "object") {
          amount = fixCommonTyposLabel(normalizeTranslatedLabel(i.amount, { trim: true }));
        } else {
          const s = String(i.amount);
          amount = fixCommonTyposLabel(normalizeTranslatedLabel({ tr: s, en: s }, { trim: true }));
        }
      }
      const order = Number.isInteger(i?.order) ? i.order : idx;
      return { name, amount, order };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((i, idx) => ({ ...i, order: idx }));
};

/** Servis adımı var mı? */
const hasServeCue = (text: TranslatedLabel): boolean =>
  SUPPORTED_LOCALES.some((lng) => {
    const v = String((text as any)[lng] || "");
    return (SERVE_CUES as any)[lng]?.some((r: RegExp) => r.test(v));
  });

/** Steps normalize + servis adımı ekle + 8 üst sınır */
const normalizeSteps = (list: any[]): { order: number; text: TranslatedLabel }[] => {
  const base = Array.isArray(list) ? list : [];
  const filtered = base
    .map((s, idx) => {
      let text = punctuateLabel(fixCommonTyposLabel(normalizeTranslatedLabel((s?.text || {}), { trim: true })));
      const hasAny = Object.values(text).some((v) => String(v).trim().length > 0);
      if (!hasAny) return null;
      const order = Number.isInteger(s?.order) ? s.order : idx + 1;
      return { order, text };
    })
    .filter(Boolean) as { order: number; text: TranslatedLabel }[];

  filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  let out = filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
  if (out.length === 0 || !hasServeCue(out[out.length - 1].text)) {
    out.push({ order: out.length + 1, text: SERVE_TEXT });
  }
  if (out.length > 8) out = out.slice(0, 8);
  return out;
};

const hardenTags = (tags: TranslatedLabel[]) =>
  tags.map((t) => {
    const key = slugify(String((t as any).en || (t as any).tr || ""), { lower: true, strict: true });
    return (TAG_CANON as any)[key] ? (TAG_CANON as any)[key] : t;
  });

/* ================= Public List ================= */

export const publicGetRecipes = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Recipe } = await getTenantModels(req);

  const { q, tag, maxTime, limit = "50" } = req.query as Record<string, string>;
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

  if (q && q.trim()) {
    const qx = q.trim();
    filter.$or = [
      ...SUPPORTED_LOCALES.map((lng) => ({ [`slug.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`title.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`tags.${lng}`]: { $regex: qx, $options: "i" } })),
      { cuisines: { $regex: qx, $options: "i" } },
    ];
  }
  if (tag) {
    const tg = String(tag);
    filter.$or = (filter.$or || []).concat(
      SUPPORTED_LOCALES.map((lng) => ({ [`tags.${lng}`]: { $regex: tg, $options: "i" } }))
    );
  }
  if (maxTime != null) filter.totalMinutes = { $lte: Number(maxTime) };

  const list = await (Recipe as any)
    .find(filter)
    .select("slug slugCanonical title images totalMinutes servings calories tags order")
    .sort({ order: 1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200))
    .lean();

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
    .select("slug slugCanonical title description images cuisines tags categories servings prepMinutes cookMinutes totalMinutes calories ingredients steps")
    .populate([{ path: "categories", select: "slug name order" }])
    .lean();

  if (!doc) {
    const or = SUPPORTED_LOCALES.map((lng) => ({ [`slug.${lng}`]: String(slug || "").toLowerCase() }));
    doc = await (Recipe as any)
      .findOne({ ...baseQ, $or: or })
      .select("slug slugCanonical title description images cuisines tags categories servings prepMinutes cookMinutes totalMinutes calories ingredients steps")
      .populate([{ path: "categories", select: "slug name order" }])
      .lean();
  }

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }
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

  const lang: SupportedLocale =
    (langRaw as SupportedLocale) || (req.locale as SupportedLocale) || getLogLocale() || "tr";

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
    const steps = normalizeSteps(d.steps);

    const slugObj = buildSlugPerLocale(d.slug, title);
    const slugCanonical = pickCanonical(slugObj, title);

    let cuisines = Array.isArray(d.cuisines)
      ? d.cuisines.map((x: any) => canonicalizeCuisine(String(x || ""))).filter(Boolean)
      : (cuisine ? [canonicalizeCuisine(String(cuisine))] : []);

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
