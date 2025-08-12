import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ISparepart } from "@/modules/sparepart/types";
import { isValidObjectId } from "@/core/utils/validation";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES } from "@/types/common";

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ CREATE (+ düşük stok bildirimi v2)
export const createSparepart = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Sparepart, Notification } = await getTenantModels(req);
    const t = (key: string, vars?: Record<string, string | number>) =>
      translate(key, locale, translations, vars);

    try {
      let {
        name,
        description,
        tags,
        category,
        brand,
        price,
        stock,
        stockThreshold,
        material,
        color,
        weightKg,
        size,
        powerW,
        voltageV,
        flowRateM3H,
        coolingCapacityKw,
        isElectric,
        batteryRangeKm,
        motorPowerW,
        isPublished,
      } = req.body;

      // Çok dilli alanlar
      name = fillAllLocales(parseIfJson(name), locale);
      description = fillAllLocales(parseIfJson(description), locale);

      // String arrayler
      tags = parseIfJson(tags);
      if (typeof tags === "string") {
        try { tags = JSON.parse(tags); } catch { tags = [tags]; }
      }
      if (!Array.isArray(tags)) tags = [];

      color = parseIfJson(color);
      if (typeof color === "string") {
        try { color = JSON.parse(color); } catch { color = [color]; }
      }
      if (!Array.isArray(color)) color = [];

      // Görseller
      const images: ISparepart["images"] = [];
      if (Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
          let imageUrl = getImagePath(file);
          let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
          if (shouldProcessImage()) {
            const processed = await processImageLocal(
              file.path,
              file.filename,
              path.dirname(file.path)
            );
            thumbnail = processed.thumbnail;
            webp = processed.webp;
          }
          images.push({
            url: imageUrl,
            thumbnail,
            webp,
            publicId: (file as any).public_id,
          });
        }
      }

      const nameForSlug = name?.[locale] || name?.en || brand || "sparepart";
      const slug = slugify(nameForSlug, { lower: true, strict: true });

      const product = await Sparepart.create({
        name,
        slug,
        description,
        tags,
        category: isValidObjectId(category) ? category : undefined,
        brand,
        price,
        stock,
        tenant: req.tenant,
        stockThreshold,
        material,
        color,
        weightKg,
        size,
        powerW,
        voltageV,
        flowRateM3H,
        coolingCapacityKw,
        isElectric: isElectric === "true" || isElectric === true,
        batteryRangeKm,
        motorPowerW,
        isPublished: isPublished === "true" || isPublished === true,
        images,
        isActive: true,
        likes: 0,
      });

      // --- DÜŞÜK STOK NOTIFICATION (create, v2) ---
      const threshold = product.stockThreshold ?? 5;
      if (typeof product.stock === "number" && product.stock <= threshold) {
        const nameObj = product.name || {};
        const title: Record<SupportedLocale, string> = {} as any;
        const message: Record<SupportedLocale, string> = {} as any;

        for (const lng of SUPPORTED_LOCALES) {
          title[lng] = translate("criticalStock.title", lng, translations);
          message[lng] = translate("criticalStock.message", lng, translations, {
            name: nameObj[lng] || String(product._id),
            stock: product.stock,
          });
        }

        await Notification.create({
          tenant: req.tenant,
          type: "warning",
          title,
          message,
          channels: ["inapp"],
          target: { roles: ["admin", "moderator"] },
          priority: 4,
          source: { module: "sparepart", entity: "sparepart", refId: product._id, event: "stock.low" },
          dedupeKey: `stock:${req.tenant}:sparepart:${product._id}`,
          dedupeWindowMin: 60,
          tags: ["stock", "sparepart"],
          data: { productId: product._id, stock: product.stock, productType: "sparepart" },
        });
      }

      logger.withReq.info(req, t("log.created"), {
        ...getRequestContext(req),
        event: "sparepart.create",
        module: "sparepart",
        sparepartId: product._id,
      });

      res.status(201).json({ success: true, message: t("log.created"), data: product });
    } catch (err: any) {
      logger.withReq.error(req, t("error.create_fail"), {
        ...getRequestContext(req),
        event: "sparepart.create",
        module: "sparepart",
        status: "fail",
        error: err.message,
      });
      res.status(500).json({ success: false, message: t("error.create_fail") });
    }
  }
);

// ✅ UPDATE (+ kritik stok bildirimi v2)
export const updateSparepart = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Sparepart, Notification } = await getTenantModels(req);
    const t = (key: string, vars?: Record<string, any>) =>
      translate(key, locale, translations, vars);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const product = await Sparepart.findOne({ _id: id, tenant: req.tenant });
    if (!product) {
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    // Çok dilli alanlar
    if (updates.name !== undefined)
      product.name = fillAllLocales(parseIfJson(updates.name));
    if (updates.description !== undefined)
      product.description = fillAllLocales(parseIfJson(updates.description));

    // String arrayler
    if (updates.tags !== undefined) {
      let newTags = parseIfJson(updates.tags);
      if (typeof newTags === "string") {
        try { newTags = JSON.parse(newTags); } catch { newTags = [newTags]; }
      }
      product.tags = Array.isArray(newTags) ? newTags : [];
    }
    if (updates.color !== undefined) {
      let newColors = parseIfJson(updates.color);
      if (typeof newColors === "string") {
        try { newColors = JSON.parse(newColors); } catch { newColors = [newColors]; }
      }
      product.color = Array.isArray(newColors) ? newColors : [];
    }

    // Diğer direkt alanlar
    const directFields: (keyof ISparepart)[] = [
      "category",
      "brand",
      "price",
      "stock",
      "stockThreshold",
      "material",
      "weightKg",
      "size",
      "powerW",
      "voltageV",
      "flowRateM3H",
      "coolingCapacityKw",
      "isElectric",
      "batteryRangeKm",
      "motorPowerW",
      "isPublished",
    ];
    for (const field of directFields) {
      if (updates[field] !== undefined) {
        (product as any)[field] = parseIfJson(updates[field]);
      }
    }

    // Görseller
    if (!Array.isArray(product.images)) product.images = [];
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const imageUrl = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(
            file.path,
            file.filename,
            path.dirname(file.path)
          );
          thumbnail = processed.thumbnail;
          webp = processed.webp;
        }
        product.images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    // Silinen görseller
    if (updates.removedImages) {
      try {
        const removed = JSON.parse(updates.removedImages);
        product.images = product.images.filter((img: any) => !removed.includes(img.url));
        for (const img of removed) {
          const localPath = path.join("uploads", req.tenant, "sparepart-images", path.basename(img.url));
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          // img burada URL string'i ise publicId erişilemez; yalnızca local dosyayı temizliyoruz.
        }
      } catch (e) {
        console.warn("Invalid removedImages JSON:", e);
      }
    }

    await product.save();

    // === KRİTİK STOK NOTIFICATION (update, v2) ===
    const threshold = product.stockThreshold ?? 5;
    if (typeof product.stock === "number" && product.stock <= threshold) {
      // hızlı anti-spam kontrol
      const existing = await Notification.findOne({
        tenant: req.tenant,
        type: "warning",
        "data.productId": product._id,
        isActive: true,
        isRead: false,
      });

      if (!existing) {
        const nameObj = product.name || {};
        const title: Record<SupportedLocale, string> = {} as any;
        const message: Record<SupportedLocale, string> = {} as any;

        for (const lng of SUPPORTED_LOCALES) {
          title[lng] = translate("criticalStock.title", lng, translations);
          message[lng] = translate("criticalStock.message", lng, translations, {
            name: nameObj[lng] || String(product._id),
            stock: product.stock,
          });
        }

        await Notification.create({
          tenant: req.tenant,
          type: "warning",
          title,
          message,
          channels: ["inapp"],
          target: { roles: ["admin", "moderator"] },
          priority: 4,
          source: { module: "sparepart", entity: "sparepart", refId: product._id, event: "stock.low" },
          dedupeKey: `stock:${req.tenant}:sparepart:${product._id}`,
          dedupeWindowMin: 60,
          tags: ["stock", "sparepart"],
          data: { productId: product._id, stock: product.stock, productType: "sparepart" },
        });
      }
    }

    logger.withReq.info(req, t("log.updated"), {
      ...getRequestContext(req),
      event: "sparepart.update",
      module: "sparepart",
      sparepartId: id,
    });

    res.status(200).json({ success: true, message: t("log.updated"), data: product });
  }
);


// ✅ DELETE
export const deleteSparepart = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Sparepart } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const product = await Sparepart.findOne({ _id: id, tenant: req.tenant });
    if (!product) {
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    for (const img of product.images) {
      const localPath = path.join(
        "uploads",
        req.tenant,
        "sparepart-images",
        path.basename(img.url)
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
          console.error("Cloudinary delete error:", err);
        }
      }
    }

    await product.deleteOne();

    logger.withReq.info(req, t("log.deleted"), {
      ...getRequestContext(req),
      event: "sparepart.delete",
      module: "sparepart",
      sparepartId: id,
    });

    res.status(200).json({ success: true, message: t("log.deleted") });
  }
);

// ✅ GET ALL
export const adminGetAllSparepart = asyncHandler(
  async (req: Request, res: Response) => {
    const { Sparepart } = await getTenantModels(req);
    const products = await Sparepart.find({ tenant: req.tenant })
      .populate("comments")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Product list fetched successfully.",
      data: products,
    });
  }
);

// ✅ GET BY ID
export const adminGetSparepartById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Sparepart } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const product = await Sparepart.findOne({ _id: id, tenant: req.tenant })
      .populate("comments")
      .populate("category", "name")
      .lean();

    if (!product || !product.isActive) {
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: t("log.fetched"), data: product });
  }
);
