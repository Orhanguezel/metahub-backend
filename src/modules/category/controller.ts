import type { Types } from "mongoose";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";
import translations from "./i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { ICategory } from "./types";
import { toShopoCategory } from "./adapter";

/* ----------------- helpers ----------------- */

type Lean<T> = Omit<T, "_id" | "id" | "save" | "remove" | "deleteOne" | "updateOne"> & { _id: Types.ObjectId };
type CategoryLean = Lean<ICategory>;

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

function slugifyUnicode(input: string): string {
  if (!input) return "";
  let s = String(input).normalize("NFKC").trim();
  s = s.replace(/\s+/g, "-");
  s = s.replace(/[^\p{L}\p{N}\p{M}-]+/gu, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.toLowerCase();
}

function pickPrimaryLocale(obj?: Record<string, any> | null): SupportedLocale | null {
  if (!obj) return null;
  const priority: ReadonlyArray<SupportedLocale> = ["tr", "en", ...LOCALES.filter(l => l !== "tr" && l !== "en")];
  for (const loc of priority) if (obj[loc] && String(obj[loc]).trim()) return loc;
  return null;
}

async function hasChildren(Category: any, tenant: string, id: string) {
  const cnt = await Category.countDocuments({ tenant, parentId: id });
  return cnt > 0;
}

async function productCountForCategory(Product: any, tenant: string, id: string) {
  return Product.countDocuments({ tenant, category: id });
}

/* ----------------- PUBLIC ----------------- */

// GET /category?view=shopo
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Category } = await getTenantModels(req);
  const { view } = req.query as { view?: string };

  const filter: Record<string, any> = { tenant: (req as any).tenant, status: "active" };
  const docs = await Category.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .lean<CategoryLean[]>();

  logger.withReq.info(req, t("fetchAll.success"), {
    ...getRequestContext(req),
    module: "category",
    event: "public.list",
    count: docs.length,
  });

  if (String(view).toLowerCase() === "shopo") {
    const items = docs.map((d) => toShopoCategory(d as any, locale));
    res.status(200).json({ success: true, message: t("fetchAll.success"), categories: items });
    return;
  }

  res.status(200).json({ success: true, message: t("fetchAll.success"), data: docs });
});

// GET /category/tree
export const getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Category } = await getTenantModels(req);

  const docs = await Category.find({ tenant: (req as any).tenant, status: "active" })
    .sort({ order: 1, createdAt: -1 })
    .lean<CategoryLean[]>();

  const byParent = new Map<string, any[]>();
  for (const c of docs) {
    const pid = c.parentId ? String(c.parentId) : "_root";
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push({ ...c, children: [] });
  }

  const attach = (arr: any[]) => {
    for (const node of arr) {
      const id = String(node._id);
      node.children = byParent.get(id) || [];
      attach(node.children);
    }
  };

  const top = byParent.get("_root") || [];
  attach(top);

  res.status(200).json({ success: true, message: t("fetchAll.success"), data: top });
});

// GET /category/:id
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req as any).locale || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Category } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalidId") });
    return;
  }

  const cat = await Category.findOne({ _id: id, tenant: (req as any).tenant }).lean<CategoryLean>();
  if (!cat) {
    res.status(404).json({ success: false, message: t("error.notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetch.success"), data: cat });
});

// GET /category/slug/:slug  (locale-aware + fallback)
export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const qLang = req.query.lang as SupportedLocale | undefined;
  const reqLocale: SupportedLocale = (req as any).locale || getLogLocale() || "en";
  const locale: SupportedLocale = qLang || reqLocale;

  const t = (key: string) => translate(key, locale, translations);
  const { Category } = await getTenantModels(req);

  if (!slug || typeof slug !== "string") {
    res.status(400).json({ success: false, message: t("error.invalidId") });
    return;
  }

  const lower = String(slug).toLowerCase();

  // önce seçilen locale
  let cat = await Category.findOne({
    tenant: (req as any).tenant,
    status: "active",
    [`slugLower.${locale}`]: lower,
  }).lean<CategoryLean>();

  // bulunamazsa tüm locale’lerde ara
  if (!cat) {
    cat = await Category.findOne({
      tenant: (req as any).tenant,
      status: "active",
      $or: LOCALES.map((l) => ({ [`slugLower.${l}`]: lower })),
    }).lean<CategoryLean>();
  }

  if (!cat) {
    res.status(404).json({ success: false, message: t("error.notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetch.success"), data: cat });
});

/* ----------------- ADMIN ----------------- */

// POST /category
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string, vars?: Record<string, string | number>) => translate(k, locale, translations, vars);
  const { Category } = await getTenantModels(req);

  try {
    const body = req.body || {};

    // i18n alanlar
    const name = parseIfJson(body.name) || {};
    const slug = parseIfJson(body.slug) || {}; // i18n gelebilir; gelmezse hook name’den üretir
    const description = parseIfJson(body.description) || {};
    const seoTitle = parseIfJson(body.seoTitle) || {};
    const seoDescription = parseIfJson(body.seoDescription) || {};

    // Görseller
    const images: ICategory["images"] = [];
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const url = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(url);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
          thumbnail = processed.thumbnail;
          webp = processed.webp;
        }
        images.push({ url, thumbnail, webp, publicId: (file as any).public_id });
      }
    }

    const doc = await Category.create({
      tenant: (req as any).tenant,
      name,
      slug,                 // hook: boş locale varsa name’den üretir; slugLower set’ler
      description,
      seoTitle,
      seoDescription,
      parentId: isValidObjectId(body.parentId) ? body.parentId : null,
      image: body.image,
      icon: body.icon,
      banner: body.banner,
      order: Number.isFinite(+body.order) ? +body.order : 0,
      status: ["active", "draft", "hidden"].includes(body.status) ? body.status : "active",
      images,
    });

    logger.withReq.info(req, t("create.success"), {
      ...getRequestContext(req),
      module: "category",
      event: "create",
      categoryId: doc._id,
    });

    res.status(201).json({ success: true, message: t("create.success"), data: doc });
  } catch (err: any) {
    // unique violation for tenant+slugLower.<locale>
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: "Slug already exists for this tenant." });
      return;
    }
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      module: "category",
      event: "create",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// PUT /category/:id
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req as any).locale || getLogLocale() || "en";
  const t = (k: string, vars?: Record<string, any>) => translate(k, locale, translations, vars);
  const { Category } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalidId") });
    return;
  }

  const doc = await Category.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("error.notFound") });
    return;
  }

  const U = req.body || {};

  // i18n alanlar (string veya object gelebilir)
  if (U.name !== undefined) (doc as any).name = parseIfJson(U.name);
  if (U.slug !== undefined) {
    const incoming = parseIfJson(U.slug);
    if (typeof incoming === "string") {
      // sadece mevcut locale’i güncelle
      (doc as any).slug = { ...(doc as any).slug, [locale]: slugifyUnicode(incoming) };
    } else {
      // gelen locale’leri güncelle
      const next = { ...(doc as any).slug };
      for (const loc of LOCALES) {
        if (incoming?.[loc]) next[loc] = slugifyUnicode(incoming[loc]);
      }
      (doc as any).slug = next;
    }
  }
  if (U.description !== undefined) (doc as any).description = parseIfJson(U.description);
  if (U.seoTitle !== undefined) (doc as any).seoTitle = parseIfJson(U.seoTitle);
  if (U.seoDescription !== undefined) (doc as any).seoDescription = parseIfJson(U.seoDescription);

  // düz alanlar
  if (U.parentId !== undefined) {
    if (U.parentId && !isValidObjectId(U.parentId)) {
      res.status(400).json({ success: false, message: "parentId must be a valid ObjectId." });
      return;
    }
    (doc as any).parentId = U.parentId || null; // cycle guard pre('save') içinde
  }
  if (U.image !== undefined) (doc as any).image = U.image;
  if (U.icon !== undefined) (doc as any).icon = U.icon;
  if (U.banner !== undefined) (doc as any).banner = U.banner;
  if (U.order !== undefined) (doc as any).order = Number.isFinite(+U.order) ? +U.order : (doc as any).order;
  if (U.status !== undefined && ["active", "draft", "hidden"].includes(String(U.status))) {
    (doc as any).status = U.status;
  }

  // yeni görseller
  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const url = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(url);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail; webp = processed.webp;
      }
      (doc as any).images.push({ url, thumbnail, webp, publicId: (file as any).public_id });
    }
  }

  // görsel silme (body.removedImages: string[] veya JSON string)
  if (U.removedImages) {
    try {
      const removed: string[] = Array.isArray(U.removedImages) ? U.removedImages : JSON.parse(String(U.removedImages));
      for (const imgUrl of removed) {
        const img = (doc as any).images.find((x: any) => x.url === imgUrl);
        if (!img) continue;
        const localPath = path.join("uploads", (req as any).tenant, "category-images", path.basename(img.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) { try { await cloudinary.uploader.destroy(img.publicId); } catch { /* ignore */ } }
      }
      (doc as any).images = (doc as any).images.filter((x: any) => !removed.includes(x.url));
    } catch { /* ignore */ }
  }

  await (doc as any).save();

  res.status(200).json({ success: true, message: t("update.success"), data: doc });
});

// DELETE /category/:id
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req as any).locale || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Category, Product } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalidId") });
    return;
  }

  const doc = await Category.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("error.notFound") });
    return;
  }

  // alt kategori var mı?
  if (await hasChildren(Category, (req as any).tenant, id)) {
    res.status(409).json({ success: false, message: "Cannot delete: category has child categories." });
    return;
  }

  // bağlı ürün var mı?
  const pCount = await productCountForCategory(Product, (req as any).tenant, id);
  if (pCount > 0) {
    res.status(409).json({ success: false, message: "Cannot delete: category has products." });
    return;
  }

  // görselleri temizle
  for (const img of (doc as any).images || []) {
    const localPath = path.join("uploads", (req as any).tenant, "category-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId) { try { await cloudinary.uploader.destroy(img.publicId); } catch { /* ignore */ } }
  }

  await (doc as any).deleteOne();

  logger.withReq.info(req, t("delete.success"), {
    ...getRequestContext(req),
    module: "category",
    event: "delete",
    categoryId: id,
  });

  res.status(200).json({ success: true, message: t("delete.success") });
});

// GET /category/admin/list
export const adminListCategories = asyncHandler(async (req: Request, res: Response) => {
  const { Category } = await getTenantModels(req);
  const { status, parentId } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: (req as any).tenant };
  if (status && ["active", "draft", "hidden"].includes(status)) filter.status = status;
  if (parentId === "root") filter.parentId = null;
  else if (parentId && isValidObjectId(parentId)) filter.parentId = parentId;

  const rows = await Category.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .lean<CategoryLean[]>();

  res.status(200).json({ success: true, message: "OK", data: rows });
});
