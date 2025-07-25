import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IBike } from "@/modules/bikes/types";
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

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ CREATE
export const createBike = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Bike } = await getTenantModels(req);
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
      frameMaterial,
      brakeType,
      wheelSize,
      gearCount,
      suspensionType,
      color,
      weightKg,
      isElectric,
      batteryRangeKm,
      motorPowerW,
      isPublished,
    } = req.body;

    // Çok dilli alanlar için otomatik locale doldurma
    name = fillAllLocales(parseIfJson(name), locale);
    description = fillAllLocales(parseIfJson(description), locale);

    // String diziler: virgüllü veya JSON array olarak gelebilir!
    tags = parseIfJson(tags);
    if (typeof tags === "string") {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = [tags];
      }
    }
    if (!Array.isArray(tags)) tags = [];

    color = parseIfJson(color);
    if (typeof color === "string") {
      try {
        color = JSON.parse(color);
      } catch {
        color = [color];
      }
    }
    if (!Array.isArray(color)) color = [];

    // Görsel işlemleri
    const images: IBike["images"] = [];
    if (Array.isArray(req.files)) {
      for (const [index, file] of (
        req.files as Express.Multer.File[]
      ).entries()) {
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

    const nameForSlug = name?.[locale] || name?.en || brand || "bike";
    const slug = slugify(nameForSlug, { lower: true, strict: true });

    const product = await Bike.create({
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
      frameMaterial,
      brakeType,
      wheelSize,
      gearCount,
      suspensionType,
      color,
      weightKg,
      isElectric,
      batteryRangeKm,
      motorPowerW,
      isPublished: isPublished === "true" || isPublished === true,
      images,
      isActive: true,
    });

    logger.withReq.info(req, t("log.created"), {
      ...getRequestContext(req),
      event: "bike.create",
      module: "bike",
      bikeId: product._id,
    });

    res
      .status(201)
      .json({ success: true, message: t("log.created"), data: product });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "bike.create",
      module: "bike",
      status: "fail",
      error: err.message,
    });

    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// ✅ UPDATE
export const updateBike = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Bike } = await getTenantModels(req);
  const t = (key: string, vars?: Record<string, any>) =>
    translate(key, locale, translations, vars);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const product = await Bike.findOne({
    _id: id,
    tenant: req.tenant,
  });
  if (!product) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  // Çok dilli alanlar (sadece varsa güncelle)
  if (updates.name !== undefined) {
    product.name = fillAllLocales(parseIfJson(updates.name));
  }
  if (updates.description !== undefined) {
    product.description = fillAllLocales(parseIfJson(updates.description));
  }

  // String array olan alanlar (dil bağımsız!)
  if (updates.tags !== undefined) {
    let newTags = parseIfJson(updates.tags);
    if (typeof newTags === "string") {
      try {
        newTags = JSON.parse(newTags);
      } catch {
        newTags = [newTags];
      }
    }
    product.tags = Array.isArray(newTags) ? newTags : [];
  }
  if (updates.color !== undefined) {
    let newColors = parseIfJson(updates.color);
    if (typeof newColors === "string") {
      try {
        newColors = JSON.parse(newColors);
      } catch {
        newColors = [newColors];
      }
    }
    product.color = Array.isArray(newColors) ? newColors : [];
  }

  // Diğer alanlar
  const directFields: (keyof IBike)[] = [
    "category",
    "brand",
    "price",
    "stock",
    "stockThreshold",
    "frameMaterial",
    "brakeType",
    "wheelSize",
    "gearCount",
    "suspensionType",
    "weightKg",
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
    for (const [index, file] of (
      req.files as Express.Multer.File[]
    ).entries()) {
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
      product.images = product.images.filter(
        (img: any) => !removed.includes(img.url)
      );
      for (const img of removed) {
        const localPath = path.join(
          "uploads",
          req.tenant,
          "bike-images",
          path.basename(img.url)
        );
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await product.save();

  logger.withReq.info(req, t("log.updated"), {
    ...getRequestContext(req),
    event: "bike.update",
    module: "bike",
    bikeId: id,
  });

  res
    .status(200)
    .json({ success: true, message: t("log.updated"), data: product });
});

// ✅ DELETE
export const deleteBike = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Bike } = await getTenantModels(req);
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const product = await Bike.findOne({
    _id: id,
    tenant: req.tenant,
  });
  if (!product) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  for (const img of product.images) {
    const localPath = path.join(
      "uploads",
      req.tenant,
      "bike-images",
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
    event: "bike.delete",
    module: "bike",
    bikeId: id,
  });

  res.status(200).json({ success: true, message: t("log.deleted") });
});

// ✅ GET ALL
export const adminGetAllBike = asyncHandler(
  async (req: Request, res: Response) => {
    const { Bike } = await getTenantModels(req);
    const products = await Bike.find({
      tenant: req.tenant,
    })
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
export const adminGetBikeById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Bike } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const product = await Bike.findOne({
      _id: id,
      tenant: req.tenant,
    })
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
