// src/modules/product/public.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { toShopProduct } from "./adapter.shop";
import mongoose from "mongoose";

const { isValidObjectId } = mongoose;

// ------------- küçük yardımcılar -------------
const toNumber = (v: any, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const splitCsv = (v: any): string[] => {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean);
  return v == null ? [] : [String(v).trim()].filter(Boolean);
};

const getLocale = (req: Request): SupportedLocale => {
  const lang =
    (req.query?.language as string) ||
    (req.headers["x-language"] as string) ||
    (getLogLocale() as string) ||
    "en";
  return (lang as SupportedLocale) || "en";
};

// Bir liste ["..."] içindeki ObjectId geçerlilerini geri döndürür
const pickValidObjectIds = (arr: string[]) => arr.filter(isValidObjectId);

// ------------- LIST -------------
export const publicListProducts = asyncHandler(async (req: Request, res: Response) => {
  const { Product, Category, Brand } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;
  const locale = getLocale(req);

  const {
    q,
    // kategori/marka varyasyonları (id veya slug gelebilir)
    category, categoryId, categoryIds, categories, categorySlug, categorySlugs,
    brand, brandId, brandIds, brands, brandSlug, brandSlugs, sku,

    // fiyat
    minPrice, maxPrice,

    // sıralama & sayfalama
    sort = "created_desc",
    page, pageSize, limit,

    // görünürlük
    status = "active",
    visibility = "public",

    // view=shopo vs (kullanılmıyor ama sorun çıkarmasın)
    view, // eslint-disable-line @typescript-eslint/no-unused-vars
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, toNumber(page, 1));
  const sizeNum = Math.min(100, Math.max(1, toNumber(limit ?? pageSize, 24)));

  const filter: any = { tenant };
  if (status) filter.status = status;
  if (visibility) filter.visibility = visibility;

  // -- KATEGORİ FİLTRESİ --
  const catTokens = [
    ...splitCsv(categoryIds ?? categories ?? categoryId ?? category),
    ...splitCsv(categorySlugs ?? categorySlug),
  ];

  if (catTokens.length) {
    // token’ları id/slug diye ayır
    const catIds = pickValidObjectIds(catTokens);
    const catSlugs = catTokens.filter((t) => !isValidObjectId(t)); // id değilse slug varsay

    let finalCatIds = [...catIds];

    if (catSlugs.length) {
      // slug -> _id çevir
      const catDocs = await Category.find({
        tenant,
        $or: [
          { [`slugLower.${locale}`]: { $in: catSlugs.map(s => s.toLowerCase()) } },
          { slugCanonical: { $in: catSlugs.map(s => s.toLowerCase()) } },
        ],
      }).select({_id:1}).lean();
      finalCatIds.push(...catDocs.map(d => String(d._id)));
    }

    // geçerli id oluştuysa filtre uygula; aksi halde hiç kategori filtresi uygulama
    finalCatIds = Array.from(new Set(finalCatIds));
    if (finalCatIds.length === 1) filter.categoryId = finalCatIds[0];
    else if (finalCatIds.length > 1) filter.categoryId = { $in: finalCatIds };
  }

  // -- MARKA FİLTRESİ --
  const brandTokens = [
    ...splitCsv(brandIds ?? brands ?? brandId ?? brand),
    ...splitCsv(brandSlugs ?? brandSlug),
  ];

  if (brandTokens.length) {
    const bIds = pickValidObjectIds(brandTokens);
    const bSlugs = brandTokens.filter((t) => !isValidObjectId(t));

    let finalBrandIds = [...bIds];

    if (bSlugs.length) {
      const brandDocs = await Brand.find({
        tenant,
        $or: [
          { [`slugLower.${locale}`]: { $in: bSlugs.map(s => s.toLowerCase()) } },
          { slugCanonical: { $in: bSlugs.map(s => s.toLowerCase()) } },
        ],
      }).select({_id:1}).lean();
      finalBrandIds.push(...brandDocs.map(d => String(d._id)));
    }

    finalBrandIds = Array.from(new Set(finalBrandIds));
    if (finalBrandIds.length === 1) filter.brandId = finalBrandIds[0];
    else if (finalBrandIds.length > 1) filter.brandId = { $in: finalBrandIds };
  }

  // -- FİYAT --
  const minP = Number(minPrice);
  const maxP = Number(maxPrice);
  if (Number.isFinite(minP) || Number.isFinite(maxP)) {
    filter.price = {};
    if (Number.isFinite(minP)) filter.price.$gte = minP;
    if (Number.isFinite(maxP)) filter.price.$lte = maxP;
  }

  // -- ARAMA --
  if (q && q.trim()) {
    filter.$text = { $search: q.trim() };
  }

    // -- SKU FİLTRESİ --
  // sku=ABC123  veya  sku=ABC123,DEF-45  şeklinde tam eşleşme
  const skuTokens = splitCsv(sku);
  if (skuTokens.length) {
    if (skuTokens.length === 1) filter.sku = skuTokens[0];
    else filter.sku = { $in: skuTokens };
  }

  // Opsiyonel: parça eşleşme için skuLike parametresi (ör. skuLike=ABC,RED-42)
  const { skuLike } = req.query as Record<string, string>;
  const skuLikeTokens = splitCsv(skuLike);
  if (skuLikeTokens.length) {
    filter.$or = [
      ...(filter.$or || []),
      ...skuLikeTokens.map((s) => ({ sku: { $regex: s, $options: "i" } })),
    ];
  }


  const sortMap: Record<string, any> = {
    created_desc: { createdAt: -1 },
    created_asc: { createdAt: 1 },
    price_asc: { price: 1, createdAt: -1 },
    price_desc: { price: -1, createdAt: -1 },
    rating_desc: { rating: -1, createdAt: -1 },
  };

  const rows = await Product.find(filter)
    .sort(sortMap[sort] || sortMap.created_desc)
    .skip((pageNum - 1) * sizeNum)
    .limit(sizeNum)
    .lean();

  const items = rows.map((p) =>
    toShopProduct({ ...p, variantsResolved: [], attributesResolved: [] }, locale)
  );
  const total = await Product.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: items,
    meta: { page: pageNum, pageSize: sizeNum, total, pages: Math.ceil(total / sizeNum) },
  });
});

// ------------- DETAIL (değişiklik yok / küçük kozmetik) -------------
export const publicGetProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { Product, ProductVariant, ProductAttribute } = await getTenantModels(req);
  const tenant = (req as any).tenant as string;
  const locale = getLocale(req);
  const { slug } = req.params as { slug: string };

  const prod = await Product.findOne({
    tenant,
    $or: [
      { [`slugLower.${locale}`]: String(slug).toLowerCase() },
      { slugCanonical: String(slug).toLowerCase() },
    ],
    status: "active",
    visibility: "public",
  }).lean();

  if (!prod) {
    res.status(404).json({ success: false, message: "Not found" });
    return;
  }

  const variants = await ProductVariant.find({ tenant, product: prod._id, isActive: true })
    .sort({ price: 1, createdAt: -1 })
    .lean();

  let attributesResolved: any[] = [];
  if (Array.isArray((prod as any).attributesPairs)) {
    attributesResolved = (prod as any).attributesPairs;
  } else if (Array.isArray((prod as any).attributes) && (prod as any).attributes.length) {
    const codes = await ProductAttribute.find({ tenant, _id: { $in: (prod as any).attributes } }).lean();
    attributesResolved = codes.map((a) => ({
      name: a.name,
      value: a.values?.[0]?.label || { en: a.values?.[0]?.code || "" },
      group: a.code,
      sort: a.values?.[0]?.sort ?? 0,
    }));
  }

  const dto = toShopProduct({ ...prod, variantsResolved: variants, attributesResolved }, locale);
  res.status(200).json({ success: true, data: dto });
});
