import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { Types } from "mongoose";

import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";

/* helpers */
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const stringifyIdsDeep = (obj: any): any => {
  if (obj == null) return obj;
  if (obj instanceof Types.ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyIdsDeep);
  if (typeof obj === "object") { for (const k of Object.keys(obj)) obj[k] = stringifyIdsDeep(obj[k]); return obj; }
  return obj;
};

const normalizeCategories = (raw: any) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;
  return arr
    .map((x: any) => ({
      category: Types.ObjectId.isValid(x?.category) ? x.category : undefined,
      order: Number.isInteger(x?.order) ? x.order : undefined,
      isFeatured: typeof x?.isFeatured === "boolean" ? x.isFeatured : undefined,
    }))
    .filter((x: any) => !!x.category);
};

const normalizeBranches = (raw: any) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;
  return arr.filter((id: any) => Types.ObjectId.isValid(id));
};

const normalizeOrder = (raw: any) => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100000, n));
};

/* ================ CREATE ================ */
export const createMenu = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Menu } = await getTenantModels(req);

  try {
    const files: Express.Multer.File[] = (req.files as any) || [];

    const {
      code, slug, name, description,
      branches, categories,
      effectiveFrom, effectiveTo,
      isPublished, isActive,
      order, // 👈 yeni
    } = req.body || {};

    if (!code || !String(code).trim()) {
      res.status(400).json({ success: false, message: t("validation.codeRequired") }); return;
    }

    const baseName = fillAllLocales(parseIfJson(name));
    const baseDesc = fillAllLocales(parseIfJson(description));

    // images
    const images: any[] = [];
    for (const file of files) {
      const imageUrl = getImagePath(file);
      if (!imageUrl) continue;
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
    }

    const loc: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
    const fallbackName = baseName?.[loc] || baseName?.en || code;
    const finalSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(fallbackName, { lower: true, strict: true });

    const doc = await Menu.create({
      tenant: req.tenant,
      code: String(code).trim(),
      slug: finalSlug,
      order: normalizeOrder(order), // 👈
      name: baseName,
      description: baseDesc,
      images,
      branches: normalizeBranches(branches),
      categories: normalizeCategories(categories) || [],
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
      isPublished: isPublished === undefined ? true : (isPublished === "true" || isPublished === true),
      isActive: isActive === undefined ? true : (isActive === "true" || isActive === true),
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id, images: images.length });
    res.status(201).json({ success: true, message: t("created"), data: doc.toJSON() });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req), event: "menu.create", error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

/* ================ UPDATE ================ */
export const updateMenu = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  const { Menu } = await getTenantModels(req);
  const doc = await Menu.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const files: Express.Multer.File[] = (req.files as any) || [];
  const {
    code, slug, name, description,
    branches, categories,
    effectiveFrom, effectiveTo,
    isPublished, isActive,
    removedImages,
    order, // 👈 yeni
  } = req.body || {};

  if (code !== undefined) (doc as any).code = String(code).trim();
  if (slug !== undefined) (doc as any).slug = slugify(String(slug), { lower: true, strict: true });
  if (name !== undefined) (doc as any).name = fillAllLocales(parseIfJson(name));
  if (description !== undefined) (doc as any).description = fillAllLocales(parseIfJson(description));
  if (branches !== undefined) (doc as any).branches = normalizeBranches(branches) || [];
  if (categories !== undefined) (doc as any).categories = normalizeCategories(categories) || [];
  if (effectiveFrom !== undefined) (doc as any).effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : undefined;
  if (effectiveTo !== undefined) (doc as any).effectiveTo = effectiveTo ? new Date(effectiveTo) : undefined;
  if (isPublished !== undefined) (doc as any).isPublished = (isPublished === "true" || isPublished === true);
  if (isActive !== undefined) (doc as any).isActive = (isActive === "true" || isActive === true);
  if (order !== undefined) (doc as any).order = normalizeOrder(order) ?? (doc as any).order; // 👈

  // add images
  if (files.length > 0) {
    for (const file of files) {
      const imageUrl = getImagePath(file);
      if (!imageUrl) continue;
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      (doc as any).images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
    }
  }

  // remove images
  if (removedImages) {
    try {
      const removed: string[] = typeof removedImages === "string" ? JSON.parse(removedImages) : removedImages;
      if (!Array.isArray(removed)) throw new Error("invalid");
      const targetObjs = (doc as any).images.filter((img: any) => removed.includes(img.url));
      (doc as any).images = (doc as any).images.filter((img: any) => !removed.includes(img.url));

      for (const imgObj of targetObjs) {
        const localPath = path.join("uploads", req.tenant, "menu-images", path.basename(imgObj.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (imgObj.publicId) { try { await cloudinary.uploader.destroy(imgObj.publicId); } catch {} }
      }
    } catch {
      res.status(400).json({ success: false, message: t("validation.imageRemoveInvalid") }); return;
    }
  }

  await doc.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id: doc._id });
  res.status(200).json({ success: true, message: t("updated"), data: doc.toJSON() });
});

/* ================ LIST (admin) ================ */
export const adminGetAllMenu = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Menu } = await getTenantModels(req);

  const { q, isActive, isPublished, branch, category, limit = "200" } = req.query as Record<string, string>;
  const filter: Record<string, any> = { tenant: req.tenant };

  if (isActive != null) filter.isActive = isActive === "true";
  if (isPublished != null) filter.isPublished = isPublished === "true";
  if (branch) filter.branches = branch;
  if (category) filter["categories.category"] = category;

  if (q && q.trim()) {
    const qx = q.trim();
    filter.$or = [
      { code: { $regex: qx, $options: "i" } },
      { slug: { $regex: qx, $options: "i" } },
      ...SUPPORTED_LOCALES.map((lng) => ({ [`name.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`description.${lng}`]: { $regex: qx, $options: "i" } })),
    ];
  }

  const list = await (Menu as any)
    .find(filter)
    .populate([{ path: "categories.category", select: "code slug name images order" }])
    .select("tenant code slug name images order categories effectiveFrom effectiveTo isActive isPublished createdAt updatedAt")
    .sort({ order: 1, createdAt: -1 }) // 👈 önce order
    .limit(Math.min(Number(limit) || 200, 500))
    .lean({ virtuals: true, getters: true });

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: stringifyIdsDeep(list) });
});

/* ================ GET BY ID (admin) ================ */
export const adminGetMenuById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Menu } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await (Menu as any)
    .findOne({ _id: id, tenant: req.tenant })
    .populate([{ path: "categories.category", select: "code slug name images order" }])
    .lean();

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }
  res.status(200).json({ success: true, message: t("fetched"), data: stringifyIdsDeep(doc) });
});

/* ================ DELETE ================ */
export const deleteMenu = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Menu } = await getTenantModels(req);
  const { id } = req.params;

  const doc = await Menu.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  for (const img of (doc as any).images || []) {
    const localPath = path.join("uploads", req.tenant, "menu-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if ((img as any).publicId) { try { await cloudinary.uploader.destroy((img as any).publicId); } catch {} }
  }

  await doc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
