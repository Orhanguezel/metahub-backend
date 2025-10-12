// FE sözleşesi (Shop) – tek dil string'lerine çevrilmiş DTO'lar
import type { SupportedLocale } from "@/types/common";

// ---------- FE tipleri ----------
export interface ShopImage {
  url: string;
  thumbnail: string;
}

export interface ShopAttribute {
  name: string;
  value: string;
  group?: string;
  sort?: number;
}

export interface ShopVariant {
  _id: string;
  productId: string;
  sku: string;
  price: number;
  salePrice?: number;
  options?: Record<string, string>;
  stock?: number;
  barcode?: string;
  image?: string;
}

export interface ShopProduct {
  _id: string;
  title: string;
  slug: string;
  price: number;
  images: ShopImage[];
  categoryId: string;

  sku?: string;
  shortDescription?: string;
  description?: string;
  brandId?: string;
  rating?: number;
  reviewCount?: number;
  stock?: number;
  badges?: string[];
  salePrice?: number;
  discountPercent?: number;
  status?: "active" | "draft" | "archived" | "hidden";
  tags?: string[];
  videoUrl?: string;
  gallery?: ShopImage[];
  attributes?: ShopAttribute[];
  variants?: ShopVariant[];
  options?: Array<{ name: string; values: string[] }>;
  shippingClass?: string;
  taxClass?: string;
  barcode?: string;
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  minPurchaseQty?: number;
  maxPurchaseQty?: number;
  visibility?: "public" | "private" | "hidden" | "draft";
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface ShopCategory {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  image?: string;
  icon?: string;
  banner?: string;
  order?: number;
  status?: "active" | "draft" | "hidden";
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ShopBrand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  description?: string;
  order?: number;
  status?: "active" | "inactive";
  website?: string;
}

// ---------- güvenli yardımcılar ----------
const LOCALE_FALLBACKS: SupportedLocale[] = [
  "tr","en","de","pl","fr","es","it","pt","ar","ru","zh","hi",
] as any;

/** Her türden değerden (string/obj/array/number/bool/null) güvenli tekil string seç */
const pickStr = (
  i18n: any,
  locale: SupportedLocale,
  extraFallbackKeys: string[] = []
): string => {
  if (i18n == null) return "";

  // düz string
  if (typeof i18n === "string") return i18n.trim();

  // number/bool
  if (typeof i18n !== "object") return String(i18n);

  // array -> ilk truthy string
  if (Array.isArray(i18n)) {
    const s = i18n.find(v => typeof v === "string" && v.trim());
    return s ? s.trim() : "";
  }

  // object -> locale -> fallbacks -> ilk string value
  const tryKeys = [locale, ...LOCALE_FALLBACKS, ...extraFallbackKeys, ...Object.keys(i18n || {})];
  for (const k of tryKeys) {
    const v = (i18n as any)[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v)) {
      const s = v.find((vv) => typeof vv === "string" && vv.trim());
      if (s) return s.trim();
    }
  }

  const first = Object.values(i18n).find(v => typeof v === "string" && v.trim());
  return (first as string | undefined)?.trim?.() || "";
};

/** i18n string[] (veya karışık) yapısından güvenli string[] seç */
const pickArr = (i18nArr: any, locale: SupportedLocale): string[] => {
  if (i18nArr == null) return [];
  if (Array.isArray(i18nArr)) return i18nArr.map(String).filter(Boolean);

  if (typeof i18nArr === "object") {
    const arr =
      (Array.isArray(i18nArr[locale]) && i18nArr[locale]) ||
      LOCALE_FALLBACKS.reduce<string[]>((acc, lng) => (acc.length ? acc : (Array.isArray(i18nArr[lng]) ? i18nArr[lng] : [])), []);
    return (arr || []).map(String).filter(Boolean);
  }
  return [];
};

/** Görseller: string objeleri ve farklı şekilleri normalize et */
const toImage = (x: any): ShopImage | null => {
  if (!x) return null;
  if (typeof x === "string") {
    return { url: x, thumbnail: x };
  }
  if (typeof x === "object") {
    const url = x.url || x.webp || x.thumbnail || "";
    const thumbnail = x.thumbnail || x.url || x.webp || "";
    if (url && thumbnail) return { url, thumbnail };
    if (url) return { url, thumbnail: url };
    if (thumbnail) return { url: thumbnail, thumbnail };
  }
  return null;
};

const mapImages = (arr?: any[]): ShopImage[] =>
  (Array.isArray(arr) ? arr : [])
    .map(toImage)
    .filter((i): i is ShopImage => !!i && !!i.url);

// ---------- ana dönüştürücüler ----------
export function toShopProduct(doc: any, locale: SupportedLocale): ShopProduct {
  const slug =
    (doc?.slugLower?.[locale]) ||
    (doc?.slug?.[locale]) ||
    doc?.slugCanonical ||
    "";

  const variantsResolved = Array.isArray(doc?.variantsResolved) ? doc.variantsResolved : [];
  const attributesResolved = Array.isArray(doc?.attributesResolved) ? doc.attributesResolved : [];

  return {
    _id: String(doc._id ?? doc.id ?? ""),
    title: pickStr(doc.title ?? doc.name, locale) || "",
    slug: String(slug),
    price: Number(doc.price) || 0,
    images: mapImages(doc.images),
    categoryId: String(doc.categoryId ?? ""),

    sku: doc.sku || undefined,
    shortDescription: pickStr(doc.shortDescription, locale) || undefined,
    description: pickStr(doc.description, locale) || undefined,
    brandId: doc.brandId ? String(doc.brandId) : undefined,
    rating: typeof doc.rating === "number" ? doc.rating : undefined,
    reviewCount: typeof doc.reviewCount === "number" ? doc.reviewCount : undefined,
    stock: typeof doc.stock === "number" ? doc.stock : undefined,
    badges: Array.isArray(doc.badges) ? doc.badges.map(String) : undefined,
    salePrice: typeof doc.salePrice === "number" ? doc.salePrice : undefined,
    discountPercent: typeof doc.discountPercent === "number" ? doc.discountPercent : undefined,
    status: doc.status,
    
    tags: pickArr(doc.tags, locale),
    videoUrl: doc.videoUrl || undefined,
    gallery: mapImages(doc.gallery),

    attributes: attributesResolved
      .map((a: any) => ({
        name: pickStr(a?.name, locale) || "",
        value: pickStr(a?.value, locale) || "",
        group: a?.group ? String(a.group) : undefined,
        sort: typeof a?.sort === "number" ? a.sort : undefined,
      }))
      .filter((x: ShopAttribute) => x.name && x.value),

    variants: variantsResolved.map((v: any) => ({
      _id: String(v._id ?? v.id ?? ""),
      productId: String(v.product ?? v.productId ?? doc._id ?? ""),
      sku: String(v.sku ?? ""),
      price: Number(v.price ?? v.price_cents) || 0,
      salePrice:
        typeof v.salePrice === "number"
          ? v.salePrice
          : typeof v.offer_price_cents === "number"
          ? v.offer_price_cents
          : undefined,
      options: v.options && typeof v.options === "object" ? v.options : undefined,
      stock: typeof v.stock === "number" ? v.stock : undefined,
      barcode: v.barcode || undefined,
      image:
        v.image ||
        (Array.isArray(v.images) && (v.images[0]?.url || v.images[0])) ||
        undefined,
    })),

    options:
      Array.isArray(doc.options) && doc.options.length
        ? doc.options
            .map((o: any) => ({
              name: pickStr(o?.name, locale) || "",
              values: pickArr(o?.values, locale),
            }))
            .filter((o: { name: string }) => !!o.name)
        : undefined,

    shippingClass: doc.shippingClass || undefined,
    taxClass: doc.taxClass || undefined,
    barcode: doc.barcode || undefined,
    weight: typeof doc.weight === "number" ? doc.weight : undefined,
    dimensions: doc.dimensions || undefined,
    minPurchaseQty: typeof doc.minPurchaseQty === "number" ? doc.minPurchaseQty : undefined,
    maxPurchaseQty: typeof doc.maxPurchaseQty === "number" ? doc.maxPurchaseQty : undefined,
    visibility: doc.visibility,
    seoTitle: pickStr(doc.seoTitle, locale) || undefined,
    seoDescription: pickStr(doc.seoDescription, locale) || undefined,
    seoKeywords: pickArr(doc.seoKeywords, locale),
  };
}

export function toShopCategory(doc: any, locale: SupportedLocale): ShopCategory {
  return {
    _id: String(doc._id ?? doc.id ?? ""),
    name: pickStr(doc.name, locale) || "",
    slug: String((doc.slugLower?.[locale] || doc.slug?.[locale] || "")),
    parentId: doc.parentId ? String(doc.parentId) : doc.parent ? String(doc.parent) : undefined,
    image: doc.image || undefined,
    icon: doc.icon || undefined,
    banner: doc.banner || undefined,
    order: typeof doc.order === "number" ? doc.order : undefined,
    status: doc.status,
    description: pickStr(doc.description, locale) || undefined,
    seoTitle: pickStr(doc.seoTitle, locale) || undefined,
    seoDescription: pickStr(doc.seoDescription, locale) || undefined,
  };
}

export function toShopBrand(doc: any, locale: SupportedLocale): ShopBrand {
  const images = Array.isArray(doc.images) ? doc.images : [];
  const logo = images.find((i: any) => i?.kind === "logo")?.url;
  const banner = images.find((i: any) => i?.kind === "banner")?.url;

  return {
    _id: String(doc._id ?? doc.id ?? ""),
    name: pickStr(doc.name, locale) || "",
    slug: String((doc.slugLower?.[locale] || doc.slug?.[locale] || "")),
    logo: logo || undefined,
    banner: banner || undefined,
    description: pickStr(doc.description, locale) || undefined,
    order: typeof doc.order === "number" ? doc.order : undefined,
    status: doc.status,
    website: doc.website || undefined,
  };
}
