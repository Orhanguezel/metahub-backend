import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/utils/uploadUtils";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { ICompany } from "./types";

// --- Yardımcılar ---
// Primitive alanlar ve çoklu dilli alanları ayrı yönetelim
const primitiveFields = [
  "tenant", "language", "taxNumber", "handelsregisterNumber", "registerCourt",
  "website", "email", "phone"
];

// --- CREATE ---
export const createCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const { Company } = await getTenantModels(req);

    if (!req.tenant) {
      res.status(400).json({ success: false, message: t("company.tenantRequired") });
      return;
    }

    // Tek tenant = tek company!
    const exists = await Company.findOne({ tenant: req.tenant });
    if (exists) {
      res.status(400).json({ success: false, message: t("company.alreadyExists") });
      return;
    }

    const body = req.body;
    body.tenant = req.tenant;
    body.language = body.language || locale || "en";

    // Çoklu dilli companyName, companyDesc 
    if (typeof body.companyName === "string") {
      body.companyName = { [locale]: body.companyName };
    }
    if (body.companyDesc && typeof body.companyDesc === "string") {
      body.companyDesc = { [locale]: body.companyDesc };
    }

    // managers ve addresses (opsiyonel)
    body.managers = Array.isArray(body.managers) ? body.managers : (body.managers ? [body.managers] : []);
    body.addresses = Array.isArray(body.addresses) ? body.addresses : [];

    // Social links default (hepsi string olmalı)
    body.socialLinks = {
      facebook: body.socialLinks?.facebook || "",
      instagram: body.socialLinks?.instagram || "",
      twitter: body.socialLinks?.twitter || "",
      linkedin: body.socialLinks?.linkedin || "",
      youtube: body.socialLinks?.youtube || "",
    };

    // Çoklu resim desteği
    const images: ICompany["images"] = [];
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const imageUrl = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
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
    body.images = images;

    // Tüm primitive alanlar
    const companyData: any = {};
    for (const field of primitiveFields) {
      if (typeof body[field] !== "undefined") {
        companyData[field] = body[field];
      }
    }
    companyData.companyName = body.companyName;
    companyData.companyDesc = body.companyDesc || {};
    companyData.managers = body.managers;
    companyData.addresses = body.addresses;
    companyData.socialLinks = body.socialLinks;
    companyData.images = images;
    companyData.bankDetails = body.bankDetails;

    const newCompany = await Company.create(companyData);

    logger.withReq.info(req, t("company.created"), {
      ...getRequestContext(req),
      id: newCompany._id,
    });
    res.status(201).json({
      success: true,
      message: t("company.created"),
      data: newCompany,
    });
  }
);

// --- UPDATE ---
export const updateCompanyInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    if (!req.tenant) {
      res.status(400).json({ success: false, message: t("company.tenantRequired") });
      return;
    }

    const { Company } = await getTenantModels(req);
    const company = await Company.findOne({ _id: id, tenant: req.tenant });
    if (!company) {
      res.status(404).json({ success: false, message: t("company.notFound") });
      return;
    }

    const updates = req.body;

    // Çoklu dilli companyName ve companyDesc güncelle
    if (updates.companyName) {
      company.companyName = { ...company.companyName, ...updates.companyName };
    }
    if (updates.companyDesc) {
      company.companyDesc = { ...company.companyDesc, ...updates.companyDesc };
    }

    // Primitive alanlar
    for (const field of primitiveFields) {
      if (typeof updates[field] !== "undefined" && updates[field] !== null) {
        (company as any)[field] = updates[field];
      }
    }

    // managers güncelle
    if (updates.managers) {
      company.managers = Array.isArray(updates.managers) ? updates.managers : [updates.managers];
    }

    // addresses güncelle
    if (updates.addresses) {
      company.addresses = Array.isArray(updates.addresses) ? updates.addresses : [updates.addresses];
    }

    // Social links güncelle
    if (updates.socialLinks) {
      company.socialLinks = {
        facebook: updates.socialLinks?.facebook || "",
        instagram: updates.socialLinks?.instagram || "",
        twitter: updates.socialLinks?.twitter || "",
        linkedin: updates.socialLinks?.linkedin || "",
        youtube: updates.socialLinks?.youtube || "",
      };
    }

    // bankDetails güncelle
    if (updates.bankDetails) {
      company.bankDetails = { ...company.bankDetails, ...updates.bankDetails };
    }

    // Yeni resimler ekle
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const imageUrl = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
          thumbnail = processed.thumbnail;
          webp = processed.webp;
        }
        company.images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    // Silinecek resimler
    if (updates.removedImages) {
      try {
        const removed: string[] = Array.isArray(updates.removedImages)
          ? updates.removedImages
          : JSON.parse(updates.removedImages);
        const toRemove = new Set(removed);
        for (const imgUrl of removed) {
          // Local sil
          const localPath = path.join("uploads", "company-images", path.basename(imgUrl));
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          // Cloudinary sil
          const img = company.images.find((img: any) => img.url === imgUrl && img.publicId);
          if (img && img.publicId) {
            await cloudinary.uploader.destroy(img.publicId);
          }
        }
        company.images = company.images.filter((img: any) => !toRemove.has(img.url));
      } catch (err) {
        logger.withReq.error(req, t("company.removeImagesError"), {
          ...getRequestContext(req),
          error: err,
        });
        res.status(400).json({ success: false, message: t("company.removeImagesError") });
        return;
      }
    }

    await company.save();

    logger.withReq.info(req, t("company.updated"), {
      ...getRequestContext(req),
      id: company._id,
    });
    res.status(200).json({
      success: true,
      message: t("company.updated"),
      data: company,
    });
  }
);

// --- GET ---
export const getCompanyInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    if (!req.tenant) {
      res.status(400).json({ success: false, message: t("company.tenantRequired") });
      return;
    }

    const { Company } = await getTenantModels(req);
    const company = await Company.findOne({ tenant: req.tenant }).select("-__v");
    if (!company) {
      logger.withReq.warn(req, t("company.notFound"), { ...getRequestContext(req) });
      res.status(404).json({ success: false, message: t("company.notFound") });
      return;
    }

    logger.withReq.info(req, t("company.fetched"), {
      ...getRequestContext(req),
      id: company._id,
    });
    res.status(200).json({
      success: true,
      message: t("company.fetched"),
      data: company,
    });
  }
);

// --- DELETE ---
export const deleteCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    if (!req.tenant) {
      res.status(400).json({ success: false, message: t("company.tenantRequired") });
      return;
    }

    const { Company } = await getTenantModels(req);
    const company = await Company.findOne({ _id: id, tenant: req.tenant });
    if (!company) {
      res.status(404).json({ success: false, message: t("company.notFound") });
      return;
    }

    for (const img of company.images || []) {
      const localPath = path.join("uploads", "company-images", path.basename(img.url));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
          logger.withReq.error(
            req,
            `Cloudinary delete error for ${img.publicId}:`,
            {
              ...getRequestContext(req),
              error: err,
            }
          );
        }
      }
    }

    await company.deleteOne();

    logger.withReq.info(req, t("company.deleted"), {
      ...getRequestContext(req),
      id,
    });
    res.status(200).json({ success: true, message: t("company.deleted") });
  }
);
