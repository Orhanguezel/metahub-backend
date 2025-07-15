import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { normalizeTenantI18nFields } from "./helpers";
import { SUPPORTED_LOCALES } from "@/types/common";
import type { ITenant } from "./types";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/utils/uploadUtils";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const t = (key: string, req: Request, params?: any) =>
  translate(key, req.locale || getLogLocale(), translations, params);

const parseIfJson = (value: any) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const i18nFields = [
  "name",
  "description",
  "metaTitle",
  "metaDescription",
  "address",
];

function completeMissingLocales(data: any) {
  for (const field of i18nFields) {
    const locales = Object.keys(data[field] || {}).filter((l) =>
      data[field][l]?.trim()
    );
    if (!locales.length) continue;
    const primaryLocale = locales.includes("en") ? "en" : locales[0];

    for (const lang of SUPPORTED_LOCALES) {
      if (!data[field][lang] || !data[field][lang].trim()) {
        data[field][lang] = data[field][primaryLocale];
      }
    }
  }
}

// ➕ CREATE TENANT (Admin)
export const createTenant = asyncHandler(
  async (req: Request, res: Response) => {
    const { Tenants } = await getTenantModels(req);

    const data: Partial<ITenant> = {
      name: fillAllLocales(parseIfJson(req.body.name)),
      slug: req.body.slug,
      mongoUri: req.body.mongoUri,
      domain: parseIfJson(req.body.domain),
      emailSettings: parseIfJson(req.body.emailSettings),
      enabledModules: parseIfJson(req.body.enabledModules),
      description: fillAllLocales(parseIfJson(req.body.description)),
      metaTitle: fillAllLocales(parseIfJson(req.body.metaTitle)),
      metaDescription: fillAllLocales(parseIfJson(req.body.metaDescription)),
      address: fillAllLocales(parseIfJson(req.body.address)),
      social: parseIfJson(req.body.social),
      isActive: req.body.isActive === "true" || req.body.isActive === true,
      logo: req.body.logo,
      theme: req.body.theme,
      phone: req.body.phone,
    };

    // Images
    let images: ITenant["images"] = [];
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
    if (images.length > 0) data.images = images;

    // Benzersiz domain kontrolü
    if (
      data.domain?.main &&
      (await Tenants.findOne({ "domain.main": data.domain.main }))
    ) {
      res.status(400).json({
        success: false,
        errors: [`Domain ${data.domain.main} already exists.`],
      });
      return;
    }

    const created = await Tenants.create(data);
    const output = normalizeTenantI18nFields(created.toObject());

    res
      .status(201)
      .json({ success: true, data: output, message: t("create.success", req) });
  }
);

// ✏️ UPDATE TENANT (Admin)
export const updateTenant = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Tenants } = await getTenantModels(req);
    const { id } = req.params;
    const tenant = await Tenants.findById(id);
    if (!tenant) {
      res
        .status(404)
        .json({ success: false, message: t("update.notFound", req) });
      return;
    }

    const { removedImages, ...updates } = req.body;

    // Görsel ekleme ve çıkarma
    if (Array.isArray(req.files)) {
      tenant.images = tenant.images || [];
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
        tenant.images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    if (removedImages) {
      const removed = parseIfJson(removedImages);
      tenant.images = tenant.images.filter((img) => !removed.includes(img.url));
      for (const imgUrl of removed) {
        const isCloudinaryImage = imgUrl.startsWith(
          "https://res.cloudinary.com/"
        );
        if (!isCloudinaryImage) {
          const localPath = path.join(
            "uploads",
            "tenant-images",
            path.basename(imgUrl)
          );
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          } else {
            console.warn(`File not found: ${localPath}`);
          }
        }
        const imgObj = tenant.images.find((img) => img.url === imgUrl);
        if (imgObj?.publicId) {
          await cloudinary.uploader.destroy(imgObj.publicId);
        }
      }
    }

    // Çok dilli alanlar merge ile güncelle
    i18nFields.forEach((field) => {
      if (updates[field]) {
        tenant[field] = mergeLocalesForUpdate(
          tenant[field],
          parseIfJson(updates[field])
        );
      }
    });

    // Diğer alanlar
    [
      "slug",
      "mongoUri",
      "domain",
      "emailSettings",
      "enabledModules",
      "social",
      "isActive",
      "logo",
      "theme",
      "phone",
    ].forEach((field) => {
      if (updates[field] !== undefined)
        tenant[field] = parseIfJson(updates[field]);
    });

    // Benzersiz domain kontrolü
    if (
      tenant.domain?.main &&
      (await Tenants.findOne({
        "domain.main": tenant.domain.main,
        _id: { $ne: id },
      }))
    ) {
      res.status(400).json({
        success: false,
        errors: [`Domain ${tenant.domain.main} already exists.`],
      });
      return;
    }

    await tenant.save();
    const output = normalizeTenantI18nFields(tenant.toObject());

    res.status(200).json({
      success: true,
      data: output,
      message: t("update.success", req, { name: tenant.name }),
    });
  }
);

// 📝 GET ALL TENANTS (Admin — panelde hepsi)
export const getAllTenantsAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { Tenants } = await getTenantModels(req);
    const items = await Tenants.find();
    const data = items.map((item) =>
      normalizeTenantI18nFields(item.toObject())
    );
    res.status(200).json({
      success: true,
      data,
      message: t("list.success", req),
    });
  }
);

// 📝 GET PUBLIC TENANTS (aktif ve public görünenler)
export const getAllTenantsPublic = asyncHandler(
  async (req: Request, res: Response) => {
    const { Tenants } = await getTenantModels(req);
    // Örneğin, sadece isActive true ve public görünenleri getiriyoruz
    const items = await Tenants.find({ isActive: true });
    const data = items.map((item) =>
      normalizeTenantI18nFields(item.toObject())
    );
    res.status(200).json({
      success: true,
      data,
      message: t("list.success", req),
    });
  }
);

// 🗑️ DELETE TENANT (Admin)
export const deleteTenant = asyncHandler(
  async (req: Request, res: Response) => {
    const { Tenants } = await getTenantModels(req);
    const { id } = req.params;
    const deleted = await Tenants.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: t("delete.notFound", req),
      });
      return;
    }
    const output = normalizeTenantI18nFields(deleted.toObject());
    logger.withReq.info(req, t("delete.success", req), {
      ...getRequestContext(req),
      module: "tenants",
      event: "tenants.delete",
      status: "success",
    });
    res.status(200).json({
      success: true,
      data: output,
      message: t("delete.success", req, { name: deleted.name }),
    });
    return;
  }
);
