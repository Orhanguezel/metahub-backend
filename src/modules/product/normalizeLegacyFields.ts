// src/modules/product/normalizeLegacyFields.ts
import type { Request, Response, NextFunction } from "express";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

const LOCALES = SUPPORTED_LOCALES as ReadonlyArray<SupportedLocale>;
const isObjectId = (s?: any) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);

function parseJSON<T = any>(v: any): T {
  if (v == null) return v as T;
  if (typeof v !== "string") return v as T;
  try { return JSON.parse(v) as T; } catch { return v as T; }
}

// "Merhaba" -> {tr:"Merhaba", en:"Merhaba", ...}
function i18nify(value: any, fallback?: string) {
  if (value == null) return undefined;
  const obj = parseJSON(value);
  if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
  const s = String(obj ?? fallback ?? "").trim();
  if (!s) return undefined;
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[l] = s;
  return out;
}

function toNumberOrUndefined(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ---------- CREATE normalizer ----------
export function normalizeCreateProductFields(req: Request, _res: Response, next: NextFunction) {
  const b: any = req.body || {};

  // name -> title
  b.title = b.title ?? i18nify(b.name);

  // slug string -> i18n
  if (b.slug && typeof b.slug === "string") b.slug = i18nify(b.slug);

  // description/shortDescription
  b.description = b.description ?? i18nify(b.desc ?? b.longDescription);
  b.shortDescription = b.shortDescription ?? i18nify(b.shortDesc);

  // category / brand
  if (!b.categoryId && isObjectId(b.category)) b.categoryId = b.category;
  if (!b.brandId && isObjectId(b.brand)) b.brandId = b.brand;

  // SELLER alias tekilleştirme (kritik)
  if (!b.sellerId && isObjectId(b.seller)) b.sellerId = b.seller;
  delete b.seller; // tek doğrulama/saklama alanı: sellerId

  // fiyatlar
  if (b.offerPrice && !b.salePrice) b.salePrice = b.offerPrice;
  const pct = toNumberOrUndefined(b.cam_product_sale);
  if (!b.salePrice && pct != null && b.price) {
    const price = Number(b.price);
    if (price > 0) b.salePrice = Math.max(0, price * (100 - pct) / 100);
  }

  // yayın durumu
  if (typeof b.isPublished !== "undefined") {
    const on = String(b.isPublished).toLowerCase() === "true";
    b.status = b.status || (on ? "active" : "draft");
    b.visibility = b.visibility || (on ? "public" : "draft");
  }

  // tip dönüşümleri
  if (typeof b.price !== "undefined") b.price = Number(b.price);
  if (typeof b.salePrice !== "undefined") b.salePrice = Number(b.salePrice);
  if (typeof b.stock !== "undefined") b.stock = Number(b.stock);

  req.body = b;
  next();
}

// ---------- UPDATE normalizer ----------
export function normalizeUpdateProductFields(req: Request, _res: Response, next: NextFunction) {
  const b: any = req.body || {};

  if (b.name && !b.title) b.title = i18nify(b.name);
  if (b.slug && typeof b.slug === "string") b.slug = i18nify(b.slug);
  if (b.desc && !b.description) b.description = i18nify(b.desc);
  if (b.shortDesc && !b.shortDescription) b.shortDescription = i18nify(b.shortDesc);

  if (!b.categoryId && isObjectId(b.category)) b.categoryId = b.category;
  if (!b.brandId && isObjectId(b.brand)) b.brandId = b.brand;

  // SELLER alias tekilleştirme (update)
  if (!b.sellerId && isObjectId(b.seller)) b.sellerId = b.seller;
  // Not: seller route zaten mySellerId ile enforce edeceğinden
  // burada sadece alias normalize ediyoruz.
  delete b.seller;

  if (b.offerPrice && !b.salePrice) b.salePrice = b.offerPrice;
  const pct = toNumberOrUndefined(b.cam_product_sale);
  if (!b.salePrice && pct != null && b.price) {
    const price = Number(b.price);
    if (price > 0) b.salePrice = Math.max(0, price * (100 - pct) / 100);
  }

  if (typeof b.isPublished !== "undefined" && !b.status && !b.visibility) {
    const on = String(b.isPublished).toLowerCase() === "true";
    b.status = on ? "active" : "draft";
    b.visibility = on ? "public" : "draft";
  }

  if (typeof b.price !== "undefined") b.price = Number(b.price);
  if (typeof b.salePrice !== "undefined") b.salePrice = Number(b.salePrice);
  if (typeof b.stock !== "undefined") b.stock = Number(b.stock);

  // removedImages JSON string gelebilir
  if (typeof b.removedImages === "string") {
    try { b.removedImages = JSON.parse(b.removedImages); } catch { /* ignore */ }
  }

  req.body = b;
  next();
}
