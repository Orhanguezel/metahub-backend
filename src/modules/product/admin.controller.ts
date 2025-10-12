// src/modules/product/admin.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import translations from "./i18n";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";

const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

// ---- generic parse helpers ----
const parseIfJson = <T = any>(v: unknown): T | any => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};
const asBool = (v: any) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true","1","yes","on"].includes(v.toLowerCase());
  return false;
};

// Base locale seçimi: tr > en > (diğerleri) > ilk dolu anahtar > fallback
const PREF_ORDER: ReadonlyArray<SupportedLocale> = [
  "tr", "en", ...LOCALES.filter(l => l !== "tr" && l !== "en"),
];

function pickBaseLocaleFrom(
  src?: Record<string, any> | null,
  fallback?: SupportedLocale
): SupportedLocale {
  for (const l of PREF_ORDER) {
    if (src && typeof src === "object" && src[l] && String(src[l]).trim()) return l;
  }
  const first = (src && Object.keys(src)[0]) as SupportedLocale | undefined;
  return first || (fallback || "en");
}

// string i18n: tüm dilleri doldur (boşlara base değeri yaz)
function expandI18nStrings(
  src: Record<string, any> | undefined,
  baseHint?: SupportedLocale
): Record<string, string> {
  const base = pickBaseLocaleFrom(src, baseHint);
  const out: Record<string, string> = { ...(src || {}) } as any;
  const seed = (out[base] ?? "").toString();
  for (const loc of LOCALES) {
    const v = out[loc];
    out[loc] = (typeof v === "string" && v.trim()) ? v : seed;
  }
  return out;
}

// string[] i18n (tags, seoKeywords gibi)
function expandI18nStringArray(
  incoming: any,
  baseHint?: SupportedLocale
): Record<string, string[]> {
  const src = parseIfJson(incoming);
  const toArray = (v: any): string[] => {
    if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
    if (typeof v === "string") return v.includes(",")
      ? v.split(",").map(s => s.trim()).filter(Boolean)
      : (v.trim() ? [v.trim()] : []);
    return [];
  };

  const obj: Record<string, string[]> =
    (src && typeof src === "object" && !Array.isArray(src)) ? Object.fromEntries(
      LOCALES.map(l => [l, toArray(src[l])])
    ) : {};

  const base = pickBaseLocaleFrom(obj, baseHint);
  const seed = obj[base] && obj[base].length ? obj[base] : [];
  for (const loc of LOCALES) {
    const arr = obj[loc] && obj[loc].length ? obj[loc] : seed;
    obj[loc] = [...new Set(arr.map(s => s.toLowerCase()))];
  }
  return obj;
}

function parseObjectIdArray(input: any): string[] {
  const v = parseIfJson(input);
  const arr = Array.isArray(v) ? v : (typeof v === "string" ? [v] : []);
  return arr.map(String).filter(s => s && isValidObjectId(s));
}

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

// ---- Görsel ekleme (multer dosyaları) ----
async function appendUploadedImages(targetArr: any[], files: Express.Multer.File[], tenant: string) {
  for (const f of files) {
    const url = getImagePath(f);
    let { thumbnail, webp } = getFallbackThumbnail(url);
    if (shouldProcessImage()) {
      const processed = await processImageLocal(f.path, f.filename, path.dirname(f.path));
      thumbnail = processed.thumbnail; webp = processed.webp;
    }
    targetArr.push({ url, thumbnail, webp, publicId: (f as any).public_id });
  }
}

// ---- Legacy alanları güvenle oku / normalize et ----
function readTitleI18nFromBody(b: any): Record<string, string> | undefined {
  const tryTitle = parseIfJson<Record<string, any>>(b?.title);
  if (tryTitle && typeof tryTitle === "object" && !Array.isArray(tryTitle)) {
    const fixed: Record<string, string> = {};
    for (const loc of LOCALES) {
      const v = tryTitle[loc];
      if (typeof v === "string") {
        try {
          const maybeObj = JSON.parse(v);
          fixed[loc] = (typeof maybeObj === "string") ? maybeObj : (tryTitle[loc] ?? "");
        } catch {
          fixed[loc] = v;
        }
      } else if (v != null) {
        fixed[loc] = String(v);
      }
    }
    return fixed;
  }

  const tryName = parseIfJson<Record<string, any> | string>(b?.name);
  if (tryName && typeof tryName === "object" && !Array.isArray(tryName)) {
    const out: Record<string, string> = {};
    for (const loc of LOCALES) out[loc] = tryName[loc] ? String(tryName[loc]) : "";
    return out;
  }
  if (typeof tryName === "string" && tryName.trim()) {
    const name = tryName.trim();
    return Object.fromEntries(LOCALES.map(l => [l, name])) as Record<string, string>;
  }
  return undefined;
}

/* -------------------- Görsel kaldırma payload parser'ı -------------------- */
type RemovedUnit = string | { url?: string; _id?: string; id?: string; publicId?: string };
function toArrayNormalized(v: any): RemovedUnit[] {
  const parsed = parseIfJson(v);
  if (Array.isArray(parsed)) return parsed as RemovedUnit[];
  if (parsed == null) return [];
  return [parsed as RemovedUnit];
}

function parseRemovedImages(U: any) {
  // desteklenen alanlar
  const buckets = [
    "removedImages",            // karışık tip: string[] | {_id|id|url|publicId}[]
    "removedExisting",          // FE'den gelebilir
    "removedImageUrls",         // string[]
    "removedImageIds",          // string[]
    "removedImagePublicIds",    // string[]
  ] as const;

  const urls = new Set<string>();
  const dbIds = new Set<string>();
  const publicIds = new Set<string>();

  for (const k of buckets) {
    const arr = toArrayNormalized(U?.[k]);
    for (const item of arr) {
      if (typeof item === "string") {
        // string geldi — ya URL ya da id olabilir; URL gibi duruyorsa URL, değilse id olarak brute-force ekleyelim
        if (/^https?:\/\//i.test(item) || item.includes("/")) urls.add(item);
        else dbIds.add(item);
        continue;
      }
      if (item && typeof item === "object") {
        if (item.url) urls.add(String(item.url));
        if (item._id) dbIds.add(String(item._id));
        if (item.id) dbIds.add(String(item.id));
        if (item.publicId) publicIds.add(String(item.publicId));
      }
    }
  }

  // URL bazen CDN ile uzun olabilir — basename eşleşmesini de destekleyelim
  const urlBases = new Set(Array.from(urls).map((u) => {
    try { return path.basename(new URL(u).pathname); } catch { return path.basename(u || ""); }
  }).filter(Boolean));

  return { urls, urlBases, dbIds, publicIds };
}

function dedupeImagesByUrl(arr: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const img of arr || []) {
    const u = String(img?.url || "");
    if (!u) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(img);
  }
  return out;
}

// ---------- CREATE ----------
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const models = await getTenantModels(req);
  const { Product, Seller } = models as any;
  const tenant = (req as any).tenant as string;
  const reqLocale = ((req as any).locale as SupportedLocale) || (getLogLocale() as SupportedLocale) || "en";

  // ---- zorunlular (title/price/category) ----
  const rawTitleFromBody = readTitleI18nFromBody(req.body);
  const rawTitle = rawTitleFromBody ?? parseIfJson<Record<string, string>>(req.body?.title);

  if (!rawTitle || typeof rawTitle !== "object" || !Object.values(rawTitle).some(s => String(s || "").trim())) {
    res.status(400).json({ success: false, message: t("validation.titleInvalid") });
    return;
  }

  const price = Number(req.body?.price);
  if (!Number.isFinite(price) || price < 0) {
    res.status(400).json({ success: false, message: t("validation.priceInvalid") });
    return;
  }

  // category alias desteği
  let categoryId = String(req.body?.categoryId || "");
  if (!categoryId && req.body?.category) categoryId = String(req.body.category);
  if (!isValidObjectId(categoryId)) {
    res.status(400).json({ success: false, message: t("validation.categoryInvalid") });
    return;
  }

  // ---- i18n genişletmeler ----
  const title = expandI18nStrings(rawTitle, reqLocale);

  const rawDescription = parseIfJson<Record<string, string>>(req.body?.description);
  const description = rawDescription
    ? expandI18nStrings(rawDescription, pickBaseLocaleFrom(rawDescription, reqLocale))
    : undefined;

  const rawShortDesc = parseIfJson<Record<string, string>>(req.body?.shortDescription);
  const shortDescription = rawShortDesc
    ? expandI18nStrings(rawShortDesc, pickBaseLocaleFrom(rawShortDesc, reqLocale))
    : undefined;

  const rawSlug = parseIfJson<Record<string, string>>(req.body?.slug);
  const slug = rawSlug
    ? expandI18nStrings(rawSlug, pickBaseLocaleFrom(rawSlug, pickBaseLocaleFrom(rawTitle, reqLocale)))
    : undefined;

  const tags = expandI18nStringArray(req.body?.tags, pickBaseLocaleFrom(rawTitle, reqLocale));
  const seoTitle = req.body?.seoTitle
    ? expandI18nStrings(parseIfJson(req.body.seoTitle), pickBaseLocaleFrom(parseIfJson(req.body.seoTitle), reqLocale))
    : undefined;
  const seoDescription = req.body?.seoDescription
    ? expandI18nStrings(parseIfJson(req.body.seoDescription), pickBaseLocaleFrom(parseIfJson(req.body.seoDescription), reqLocale))
    : undefined;
  const seoKeywords = expandI18nStringArray(req.body?.seoKeywords, pickBaseLocaleFrom(rawTitle, reqLocale));

  // ---- ilişkiler / opsiyoneller ----
  const attributes = parseObjectIdArray(req.body?.attributes);
  const variants = parseObjectIdArray(req.body?.variants);
  const options = parseIfJson(req.body?.options);
  const dimensions = parseIfJson(req.body?.dimensions);
  const gallery = parseIfJson(req.body?.gallery);

  // brand alias (brand -> brandId)
  let brandId: string | undefined;
  if (req.body?.brandId && isValidObjectId(req.body.brandId)) brandId = req.body.brandId;
  else if (req.body?.brand && isValidObjectId(String(req.body.brand))) brandId = String(req.body.brand);

  // ---- SELLER ID RESOLUTION ----
  const user = (req as any).user || {};
  const roles: string[] = [user.role, ...(user.roles || [])].filter(Boolean);
  const isPrivileged = roles.some((r) => ["admin", "moderator", "superadmin"].includes(r));

  let resolvedSellerId: string | null = null;

  const mySellerId = (req as any).mySellerId as string | undefined;
  if (mySellerId) {
    resolvedSellerId = mySellerId;
  } else {
    const sellerCandidate = req.body?.sellerId ?? req.body?.seller;
    if (sellerCandidate != null && sellerCandidate !== "") {
      const sid = String(sellerCandidate);
      if (!isValidObjectId(sid)) {
        res.status(400).json({ success: false, message: "sellerId_invalid" });
        return;
      }
      const sellerDoc = await models.Seller.findOne({ _id: sid, tenant }).select({ _id: 1 }).lean();
      if (!sellerDoc) {
        res.status(404).json({ success: false, message: "seller_not_found" });
        return;
      }
      resolvedSellerId = sid;
    } else {
      resolvedSellerId = null;
    }
  }

  // isPublished -> visibility/status (opsiyonel)
  if (req.body?.isPublished != null) {
    const pub = asBool(req.body.isPublished);
    if (!req.body.visibility) req.body.visibility = pub ? "public" : "draft";
    if (!req.body.status) req.body.status = pub ? "active" : "draft";
  }

  // ---- görseller ----
  let images: any[] = [];
  if (Array.isArray(req.files) && req.files.length) {
    await appendUploadedImages(images, req.files as Express.Multer.File[], tenant);
  }
  images = dedupeImagesByUrl(images);

  // ---- create + duplicate yakalama ----
  try {
    const payload: any = {
      tenant,
      title,
      slug,
      shortDescription,
      description,
      price,
      images,
      categoryId,

      // optionals
      sellerId: resolvedSellerId || undefined,
      sku: req.body?.sku || undefined,
      brandId,
      rating: req.body?.rating != null ? Number(req.body.rating) : undefined,
      reviewCount: req.body?.reviewCount != null ? Number(req.body.reviewCount) : undefined,
      stock: req.body?.stock != null ? Number(req.body.stock) : undefined,
      badges: Array.isArray(req.body?.badges) ? req.body.badges : undefined,
      salePrice: req.body?.salePrice != null ? Number(req.body.salePrice) : undefined,
      status: req.body?.status || undefined,
      tags,
      videoUrl: req.body?.videoUrl || undefined,
      gallery: Array.isArray(gallery) ? gallery : undefined,

      attributes: attributes.length ? attributes : undefined,
      variants: variants.length ? variants : undefined,
      options: Array.isArray(options) ? options : undefined,

      shippingClass: req.body?.shippingClass || undefined,
      taxClass: req.body?.taxClass || undefined,
      barcode: req.body?.barcode || undefined,

      weight: req.body?.weight != null ? Number(req.body.weight) : undefined,
      dimensions: dimensions && typeof dimensions === "object" ? dimensions : undefined,

      minPurchaseQty: req.body?.minPurchaseQty != null ? Number(req.body.minPurchaseQty) : undefined,
      maxPurchaseQty: req.body?.maxPurchaseQty != null ? Number(req.body.maxPurchaseQty) : undefined,

      visibility: req.body?.visibility || undefined,

      seoTitle,
      seoDescription,
      seoKeywords,
    };

    const created = await Product.create(payload);

    // Seller akışı Postman testleri 'seller' populate bekliyor
    const populated = await Product.findById(created._id)
      .populate({
        path: "seller",
        select: "companyName contactName slug avatarUrl rating isActive",
        strictPopulate: false,
      })
      .lean();

    res.status(201).json({ success: true, message: t("created"), data: populated || created });
  } catch (err: any) {
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || "";
      const msg =
        key.includes("slugCanonical") || key.includes("slugLower") || key === "slug"
          ? "Slug zaten kullanılıyor. Başlığı değiştirin veya slug gönderin."
          : "Benzersiz alan çakışması.";
      res.status(409).json({ success: false, message: msg });
      return;
    }
    throw err;
  }
});



// ---------- UPDATE ----------
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const models = await getTenantModels(req);
  const { Product } = models as any;
  const tenant = (req as any).tenant as string;
  const reqLocale = ((req as any).locale as SupportedLocale) || (getLogLocale() as SupportedLocale) || "en";

  const doc = await Product.findOne({ _id: id, tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const U = req.body;

  // i18n genişletmeler
  if (U.title !== undefined) {
    const raw = parseIfJson<Record<string, string>>(U.title);
    doc.set("title", expandI18nStrings(raw, pickBaseLocaleFrom(raw, pickBaseLocaleFrom((doc as any).title, reqLocale))), { strict: false });
  }
  if (U.shortDescription !== undefined) {
    const raw = parseIfJson<Record<string, string>>(U.shortDescription);
    doc.set("shortDescription", expandI18nStrings(raw, pickBaseLocaleFrom(raw, pickBaseLocaleFrom((doc as any).shortDescription, reqLocale))), { strict: false });
  }
  if (U.description !== undefined) {
    const raw = parseIfJson<Record<string, string>>(U.description);
    doc.set("description", expandI18nStrings(raw, pickBaseLocaleFrom(raw, pickBaseLocaleFrom((doc as any).description, reqLocale))), { strict: false });
  }
  if (U.slug !== undefined) {
    const raw = parseIfJson<Record<string, string>>(U.slug);
    doc.set("slug", expandI18nStrings(raw, pickBaseLocaleFrom(raw, pickBaseLocaleFrom((doc as any).slug, reqLocale))), { strict: false });
  }

  if (U.tags !== undefined) {
    doc.set("tags", expandI18nStringArray(U.tags, pickBaseLocaleFrom((doc as any).title, reqLocale)), { strict: false });
  }
  if (U.seoTitle !== undefined) {
    const raw = parseIfJson<Record<string, string>>(U.seoTitle);
    doc.set("seoTitle", expandI18nStrings(raw, pickBaseLocaleFrom(raw, reqLocale)), { strict: false });
  }
  if (U.seoDescription !== undefined) {
    const raw = parseIfJson<Record<string, string>>(U.seoDescription);
    doc.set("seoDescription", expandI18nStrings(raw, pickBaseLocaleFrom(raw, reqLocale)), { strict: false });
  }
  if (U.seoKeywords !== undefined) {
    doc.set("seoKeywords", expandI18nStringArray(U.seoKeywords, pickBaseLocaleFrom((doc as any).title, reqLocale)), { strict: false });
  }

  // numerics
  const numeric = ["price","salePrice","rating","reviewCount","stock","weight","minPurchaseQty","maxPurchaseQty"];
  for (const k of numeric) if (U[k] !== undefined) doc.set(k, U[k] === "" ? undefined : Number(U[k]), { strict: false });

  // strings
  const strings = ["sku","videoUrl","shippingClass","taxClass","barcode","status","visibility"];
  for (const k of strings) if (U[k] !== undefined) doc.set(k, U[k] === "" ? undefined : U[k], { strict: false });

  // relations
  if (U.categoryId !== undefined) {
    if (U.categoryId && !isValidObjectId(U.categoryId)) {
      res.status(400).json({ success: false, message: t("validation.categoryInvalid") });
      return;
    }
    doc.set("categoryId", U.categoryId || undefined, { strict: false });
  }
  if (U.brandId !== undefined) {
    if (U.brandId && !isValidObjectId(U.brandId)) {
      res.status(400).json({ success: false, message: t("validation.brandInvalid") });
      return;
    }
    doc.set("brandId", U.brandId || undefined, { strict: false });
  }

  if (U.attributes !== undefined) doc.set("attributes", parseObjectIdArray(U.attributes), { strict: false });
  if (U.variants !== undefined) doc.set("variants", parseObjectIdArray(U.variants), { strict: false });

  if (U.options !== undefined) {
    const opts = parseIfJson(U.options);
    doc.set("options", Array.isArray(opts) ? opts : [], { strict: false });
  }
  if (U.dimensions !== undefined) {
    const dim = parseIfJson(U.dimensions);
    doc.set("dimensions", dim && typeof dim === "object" ? dim : undefined, { strict: false });
  }
  if (U.gallery !== undefined) {
    const gal = parseIfJson(U.gallery);
    doc.set("gallery", Array.isArray(gal) ? gal : [], { strict: false });
  }

  // ⬇️ sellerId (opsiyonel set/unset) — alias: seller
  if (U.sellerId !== undefined || U.seller !== undefined) {
    const rawSeller = U.sellerId ?? U.seller;
    if (rawSeller == null || rawSeller === "" || String(rawSeller).toLowerCase() === "null") {
      (doc as any).sellerId = null;
    } else {
      const sid = String(rawSeller);
      if (!isValidObjectId(sid)) {
        res.status(400).json({ success: false, message: "sellerId_invalid" });
        return;
      }
      const { Seller } = await getTenantModels(req) as any;
      const exists = await Seller.findOne({ _id: sid, tenant }).select({ _id: 1 }).lean();
      if (!exists) {
        res.status(400).json({ success: false, message: "seller_not_found" });
        return;
      }
      (doc as any).sellerId = sid;
    }
  }

  /* -------------------- IMAGES: add & remove -------------------- */
  if (!Array.isArray((doc as any).images)) (doc as any).images = [];

  // 1) Yeni yüklenenleri ekle
  if (Array.isArray(req.files) && req.files.length) {
    await appendUploadedImages((doc as any).images, req.files as Express.Multer.File[], tenant);
  }

  // 2) Kaldırılacakları işle
  const { urls, urlBases, dbIds, publicIds } = parseRemovedImages(U);
  if (urls.size || urlBases.size || dbIds.size || publicIds.size) {
    const before: any[] = Array.isArray((doc as any).images) ? (doc as any).images : [];
    const keep: any[] = [];
    const removedItems: any[] = [];

    for (const img of before) {
      const url: string = String(img?.url || "");
      const base = url ? path.basename(url) : "";
      const idStr = String((img?._id ?? img?.id) || "");
      const pubId = String(img?.publicId || "");

      const match =
        (url && urls.has(url)) ||
        (base && urlBases.has(base)) ||
        (idStr && dbIds.has(idStr)) ||
        (pubId && publicIds.has(pubId));

      if (match) removedItems.push(img);
      else keep.push(img);
    }

    (doc as any).images = keep;

    // Fiziksel temizleme (best effort)
    for (const img of removedItems) {
      try {
        if (img?.publicId) {
          try { await cloudinary.uploader.destroy(img.publicId); } catch { /* ignore cloudinary errors */ }
        }
        const imgUrl: string = String(img?.url || "");
        if (imgUrl) {
          const localPath = path.join("uploads", tenant, "product-images", path.basename(imgUrl));
          if (fs.existsSync(localPath)) {
            try { fs.unlinkSync(localPath); } catch { /* ignore fs errors */ }
          }
        }
      } catch { /* ignore */ }
    }
  }

  // 3) Son olarak tekilleştir (aynı URL iki kez olmasın)
  (doc as any).images = dedupeImagesByUrl((doc as any).images);

  await doc.save();
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});


// ---------- DELETE ----------
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Product } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;

  const doc = await Product.findOne({ _id: id, tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  for (const img of (doc as any).images || []) {
    const localPath = path.join("uploads", tenant, "product-images", path.basename(String(img?.url || "")));
    if (fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch { /* ignore */ } }
    if (img?.publicId) { try { await cloudinary.uploader.destroy(img.publicId); } catch { /* ignore */ } }
  }

  await doc.deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
});

const SELLER_PROJECTION = "companyName contactName slug avatarUrl rating isActive";

// ---------- LIST (ADMIN) ----------
export const adminListProducts = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Product } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;

  const {
    q, categoryId, brandId, status, visibility,
    minPrice, maxPrice, minStock, maxStock,
    sellerId,
    sort = "created_desc",
    page = "1", pageSize = "50",
  } = req.query as Record<string, string>;

  const filter: any = { tenant };

  if (q && q.trim()) filter.$text = { $search: q.trim() };
  if (categoryId && isValidObjectId(categoryId)) filter.categoryId = categoryId;
  if (brandId && isValidObjectId(brandId)) filter.brandId = brandId;
  if (status) filter.status = status;
  if (visibility) filter.visibility = visibility;
  if (sellerId && isValidObjectId(sellerId)) filter.sellerId = sellerId;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (minStock || maxStock) {
    filter.stock = {};
    if (minStock) filter.stock.$gte = Number(minStock);
    if (maxStock) filter.stock.$lte = Number(maxStock);
  }

  const sortMap: Record<string, any> = {
    created_desc: { createdAt: -1 },
    created_asc: { createdAt: 1 },
    price_asc: { price: 1, createdAt: -1 },
    price_desc: { price: -1, createdAt: -1 },
    stock_desc: { stock: -1, createdAt: -1 },
    stock_asc: { stock: 1, createdAt: -1 },
    rating_desc: { rating: -1, createdAt: -1 },
  };

  const pageNum = Math.max(1, Number(page) || 1);
  const sizeNum = Math.min(200, Math.max(1, Number(pageSize) || 50));

  const rows = await Product.find(filter)
    .sort(sortMap[sort] || sortMap.created_desc)
    .skip((pageNum - 1) * sizeNum)
    .limit(sizeNum)
    .populate({ path: "sellerId", select: SELLER_PROJECTION, model: "seller" })
    .lean();

  // geriye uyumluluk: sellerId populate edildiyse seller alanına kopyala
  const data = rows.map((r: any) => ({
    ...r,
    seller: (r && typeof r.sellerId === "object") ? r.sellerId : undefined,
  }));

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    success: true,
    message: t("listFetched"),
    data,
    meta: { page: pageNum, pageSize: sizeNum, total, pages: Math.ceil(total / sizeNum) },
  });
});

// ---------- GET BY ID (ADMIN) ----------
export const adminGetProductById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Product } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;

  const doc: any = await Product.findOne({ _id: id, tenant })
    .populate({ path: "sellerId", select: SELLER_PROJECTION, model: "seller" })
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  // geriye uyumluluk: sellerId populate edildiyse seller alanına kopyala
  if (doc && typeof doc.sellerId === "object") {
    doc.seller = doc.sellerId;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
