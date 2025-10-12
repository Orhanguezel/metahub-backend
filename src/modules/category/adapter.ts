import path from "path";
import type { ICategory, ShopoCategoryCard } from "./types";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

function firstI18nValue(obj?: Record<string, string> | null): string | undefined {
  if (!obj) return undefined;
  for (const l of LOCALES) {
    if (obj[l] && String(obj[l]).trim()) return String(obj[l]);
  }
  const vals = Object.values(obj || {});
  return vals.find((v) => typeof v === "string" && v.trim());
}

export function toShopoCategory(doc: ICategory, locale: SupportedLocale = "en"): ShopoCategoryCard {
  const firstImg = Array.isArray(doc.images) && doc.images.length > 0 ? doc.images[0] : null;
  const fileName = firstImg?.url ? path.basename(firstImg.url) : "cat-1.jpg";

  const title =
    (doc?.name as any)?.[locale] ||
    (doc?.name as any)?.en ||
    firstI18nValue(doc?.name as any) ||
    "Category";

  const slug =
    (doc?.slug as any)?.[locale] ||
    (doc?.slug as any)?.en ||
    firstI18nValue(doc?.slug as any) ||
    "category";

  return {
    id: String((doc as any)._id),
    title,
    slug,
    image: fileName,
  };
}
