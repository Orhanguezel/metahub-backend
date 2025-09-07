import slugify from "slugify";
import { SUPPORTED_LOCALES, type TranslatedLabel } from "@/types/recipes/common";
import { PREFERRED_CANONICAL_ORDER } from "../ai.constants";

/** Güvenli slug üretimi (tamamen numerik olanları reddeder) */
export const safeSlug = (raw: any, fallback?: string) => {
  const s = slugify(String(raw || ""), { lower: true, strict: true });
  const ok = s && !/^\d+$/.test(s);
  return ok ? s : fallback ? slugify(fallback, { lower: true, strict: true }) : "";
};

/** Çok dilli slug üretimi (başlığa fallback) */
export const buildSlugPerLocale = (slugObj: any, title: TranslatedLabel): TranslatedLabel => {
  const out = {} as TranslatedLabel;
  const fallback = (title?.en || title?.tr || "").trim();
  for (const lng of SUPPORTED_LOCALES) {
    const raw = slugObj && (slugObj as any)[lng] ? (slugObj as any)[lng] : (title?.[lng] || "");
    (out as any)[lng] = safeSlug(raw, fallback) || safeSlug(fallback);
  }
  return out;
};

/** Canonical slug seçimi (dil öncelik sırasına göre) */
export const pickCanonical = (slugObj: TranslatedLabel, title: TranslatedLabel) => {
  for (const l of PREFERRED_CANONICAL_ORDER) {
    const v = (slugObj as any)?.[l] || (title?.[l] ? slugify(String(title[l]), { lower: true, strict: true }) : "");
    if (v) return v;
  }
  return `recipe-${Date.now()}`;
};

/** (Kolaylık) Girdi slug + title’dan ikisini birlikte üretir */
export const buildSlugAndCanonical = (slugInput: any, titleObj: TranslatedLabel) => {
  const slugObj = buildSlugPerLocale(slugInput, titleObj);
  const canonical = pickCanonical(slugObj, titleObj);
  return { slugObj, canonical };
};
