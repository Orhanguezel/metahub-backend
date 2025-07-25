import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { v2 as cloudinary } from "cloudinary";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";
import fs from "fs";
import path from "path";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { ISettings } from "./types";

export const upsertSettingImage = asyncHandler(
  async (req: Request, res: Response) => {
    const { Settings } = await getTenantModels(req);
    const { key } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!req.tenant) {
      res
        .status(400)
        .json({ success: false, message: t("settings.tenantRequired") });
      return;
    }
    if (!key) {
      res
        .status(400)
        .json({ success: false, message: t("setting.error.missing") });
      return;
    }

    // Çoklu resim desteği
    const images: ISettings["images"] = [];
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
        images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    let settings = await Settings.findOne({ key, tenant: req.tenant });
    if (settings) {
      // Önce eski resimleri sil
      for (const img of settings.images || []) {
        const localPath = path.join(
          "uploads",
          req.tenant,
          "settings-images",
          path.basename(img.url)
        );
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId)
          await cloudinary.uploader.destroy(img.publicId).catch(() => {});
      }
      settings.images = images;
      await settings.save();
    } else {
      settings = await Settings.create({
        key,
        value: "",
        isActive: true,
        tenant: req.tenant,
        images,
      });
    }

    logger.withReq.info(req, t("setting.upload.success"), {
      ...getRequestContext(req),
      key,
    });
    res.status(201).json({
      success: true,
      message: t("setting.upload.success"),
      data: settings,
    });
    return;
  }
);

export const updateSettingImage = asyncHandler(
  async (req: Request, res: Response) => {
    const { Settings } = await getTenantModels(req);
    const { key } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!req.tenant) {
      res
        .status(400)
        .json({ success: false, message: t("settings.tenantRequired") });
      return;
    }
    if (!key) {
      logger.withReq.warn(req, "Key param missing", {
        ...getRequestContext(req),
        event: "setting.updateImage",
        status: "fail",
      });
      res
        .status(400)
        .json({ success: false, message: t("setting.error.missing") });
      return;
    }

    const settings = await Settings.findOne({ key, tenant: req.tenant });
    if (!settings) {
      res
        .status(404)
        .json({ success: false, message: t("setting.error.notFound") });
      return;
    }

    let currentImages = Array.isArray(settings.images)
      ? [...settings.images]
      : [];

    // --- Silinecek resimler
    let removed: string[] = [];
    if (req.body.removedImages) {
      try {
        removed = Array.isArray(req.body.removedImages)
          ? req.body.removedImages
          : JSON.parse(req.body.removedImages);

        for (const imgUrl of removed) {
          const localPath = path.join(
            "uploads",
            req.tenant,
            "settings-images",
            path.basename(imgUrl)
          );
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          const img = currentImages.find(
            (img: any) => img.url === imgUrl && img.publicId
          );
          if (img && img.publicId) {
            await cloudinary.uploader.destroy(img.publicId).catch(() => {});
          }
        }
        currentImages = currentImages.filter(
          (img: any) => !removed.includes(img.url)
        );
      } catch (err) {
        logger.withReq.error(req, t("settings.removeImagesError"), {
          ...getRequestContext(req),
          error: err,
        });
        res
          .status(400)
          .json({ success: false, message: t("settings.removeImagesError") });
        return;
      }
    }

    // --- Yeni resimler (yeni upload edilen dosyalar)
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
        currentImages.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    settings.images = currentImages;
    await settings.save();

    logger.withReq.info(req, t("setting.update.success"), {
      ...getRequestContext(req),
      event: "setting.updateImage",
      status: "success",
      key,
    });
    res.status(200).json({
      success: true,
      message: t("setting.update.success"),
      data: settings,
    });
    return;
  }
);

export const deleteSetting = asyncHandler(async (req, res) => {
  const { Settings } = await getTenantModels(req);
  const { key } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);

  if (!key) {
    res
      .status(400)
      .json({ success: false, message: t("setting.error.missing") });
    return;
  }

  const settings = await Settings.findOneAndDelete({ key, tenant: req.tenant });
  if (!settings) {
    res
      .status(404)
      .json({ success: false, message: t("setting.error.notFound") });
    return;
  }
  // Tüm images’ları sil
  for (const img of settings.images || []) {
    const localPath = path.join(
      "uploads",
      req.tenant,
      "settings-images",
      path.basename(img.url)
    );
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId)
      await cloudinary.uploader.destroy(img.publicId).catch(() => {});
  }

  logger.withReq.info(req, t("settings.deleted"), {
    ...getRequestContext(req),
    key,
  });
  res.status(200).json({ success: true, message: t("settings.deleted") });
  return;
});

export const upsertSetting = asyncHandler(async (req, res) => {
  const { Settings } = await getTenantModels(req);
  const { key, value, isActive = true } = req.body;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);

  if (!key || typeof value === "undefined") {
    res
      .status(400)
      .json({ success: false, message: "Key and value fields are required." });
    return;
  }

  let settings = await Settings.findOne({ key, tenant: req.tenant });

  if (settings) {
    settings.value = value;
    settings.isActive =
      typeof isActive === "boolean" ? isActive : settings.isActive;
    await settings.save();
  } else {
    settings = await Settings.create({
      key,
      value,
      isActive,
      tenant: req.tenant,
    });
  }

  logger.withReq.info(req, t("setting.update.success"), {
    ...getRequestContext(req),
    key,
  });
  res.status(200).json({
    success: true,
    message: t("setting.update.success"),
    data: settings,
  });
  return;
});

export const getAllSettingsAdmin = asyncHandler(async (req, res) => {
  const { Settings } = await getTenantModels(req);
  const settings = await Settings.find({ tenant: req.tenant }).sort({
    createdAt: -1,
  });
  res.status(200).json({ success: true, data: settings });
  return;
});

export const getSettingByKeyAdmin = asyncHandler(async (req, res) => {
  const { Settings } = await getTenantModels(req);
  const { key } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);

  if (!key?.trim()) {
    res
      .status(400)
      .json({ success: false, message: t("setting.error.missing") });
    return;
  }
  // Normalize key
  const settingKey = key.trim();
  const settings = await Settings.findOne({
    key: settingKey,
    tenant: req.tenant,
  });
  if (!settings) {
    res
      .status(404)
      .json({ success: false, message: t("setting.error.notFound") });
    return;
  }
  res.status(200).json({ success: true, data: settings });
  return;
});
