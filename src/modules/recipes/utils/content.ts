import slugify from "slugify";
import { Types } from "mongoose";
import { SUPPORTED_LOCALES, type TranslatedLabel } from "@/types/recipes/common";
import { normalizeTranslatedLabel, fixCommonTyposLabel, punctuateLabel } from "./i18n";
import { SERVE_CUES, SERVE_TEXT, TAG_CANON, canonicalizeCuisine } from "../ai.constants";
import { parseIfJson, toStringArray } from "./parse";

/** tags: string[] | TranslatedLabel[] → normalize + dedupe (admin tarafı esnek) */
export const normalizeTagsInput = (raw: any): TranslatedLabel[] | undefined => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;

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

/** Zaten TranslatedLabel[] olan tag listesinde normalize + dedupe (public/AI) */
export const normalizeTagsLocalized = (tags: any): TranslatedLabel[] => {
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

/** Derived etiketleri (cuisine/dietary) eksikse ekle */
export const addDerivedTagsIfMissing = (base: TranslatedLabel[], derivedStrings: string[]): TranslatedLabel[] => {
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

/** Tag sözlüğüyle sertleştir */
export const hardenTags = (tags: TranslatedLabel[]) =>
  tags.map((t) => {
    const key = slugify(String((t as any).en || (t as any).tr || ""), { lower: true, strict: true });
    return (TAG_CANON as any)[key] ? (TAG_CANON as any)[key] : t;
  });

/** cuisines: string[] → kanonik + dedupe (italian, turkish, ...) */
export const normalizeCuisines = (raw: any) => {
  const list = toStringArray(raw).map(canonicalizeCuisine);
  const set = new Set(list.filter(Boolean));
  return Array.from(set);
};

/** categories: ObjectId[] (opsiyonel) */
export const normalizeCategories = (raw: any) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;
  return arr.filter((id: any) => Types.ObjectId.isValid(id));
};

/** ingredients: name & amount çok dilli, order 0..N */
export const normalizeIngredients = (raw: any) => {
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

/** step sonu servis/plating var mı? */
export const hasServeCue = (text: TranslatedLabel): boolean =>
  SUPPORTED_LOCALES.some((lng) => {
    const v = String((text as any)[lng] || "");
    return (SERVE_CUES as any)[lng]?.some((r: RegExp) => r.test(v));
  });

/** Steps normalize (parametrik) */
export const normalizeStepsBase = (
  raw: any,
  opts?: { ensureServeStep?: boolean; maxSteps?: number }
) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;

  const mapped = arr
    .map((s: any, idx: number) => ({
      order: Number.isInteger(s?.order) ? s.order : idx + 1,
      text: punctuateLabel(fixCommonTyposLabel(normalizeTranslatedLabel(parseIfJson(s?.text) || {}, { trim: true }))),
    }))
    .filter((s: any) => Object.values(s.text).some((v) => String(v).trim().length > 0))
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    .map((s: any, idx: number) => ({ ...s, order: idx + 1 })); // 1..N

  let out = mapped;
  if (opts?.ensureServeStep) {
    if (out.length === 0 || !hasServeCue(out[out.length - 1].text)) {
      out.push({ order: out.length + 1, text: SERVE_TEXT });
    }
  }
  if (opts?.maxSteps && out.length > opts.maxSteps) out = out.slice(0, opts.maxSteps);
  // yeniden 1..N
  return out.map((s, i) => ({ ...s, order: i + 1 }));
};
