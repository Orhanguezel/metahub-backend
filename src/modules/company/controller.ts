// src/modules/company/controller.ts
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
} from "@/core/middleware/file/uploadUtils";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { ICompany } from "./types";
import { parseNestedFields } from "@/core/utils/parseNestedFields";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";

/* -------------------- Helpers -------------------- */
const primitiveFields = [
  "tenant",
  "language",
  "taxNumber",
  "handelsregisterNumber",
  "registerCourt",
  "website",
  "email",
  "phone",
];

const normalizeToStringArray = (val: any): string[] => {
  if (val == null) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [val];
    } catch {
      return [val];
    }
  }
  return [String(val)];
};

const normalizeAddresses = (val: any): any[] => {
  // Gelen değer: ['60f..', '61a..'] | "['...']" | '60f..' | [{_id:..}] vb.
  // Populate için ObjectId referansları beklenir; burada sadece dizi haline getiriyoruz.
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [val];
    } catch {
      return [val];
    }
  }
  return [val];
};

const populateAddresses = async (doc: any) => {
  if (!doc) return doc;
  await doc.populate({ path: "addresses" });
  return doc;
};

/* =========================================================
 * CREATE
 * =======================================================*/
export const createCompany = asyncHandler(async (req: Request, res: Response) => {
  req.body = parseNestedFields(req.body);

  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Company } = await getTenantModels(req);

  if (!req.tenant) {
    res.status(400).json({ success: false, message: t("company.tenantRequired") });
    return;
  }

  // Tek tenant = tek company
  const exists = await Company.findOne({ tenant: req.tenant });
  if (exists) {
    res.status(400).json({ success: false, message: t("company.alreadyExists") });
    return;
  }

  const body = req.body || {};
  body.tenant = req.tenant;
  body.language = body.language || locale || "en";

  // Çok dilli alanlar
  if (body.companyName) {
    if (typeof body.companyName === "string") {
      try { body.companyName = JSON.parse(body.companyName); }
      catch { body.companyName = { [locale]: body.companyName }; }
    }
    body.companyName = fillAllLocales(body.companyName);
  }
  if (body.companyDesc) {
    if (typeof body.companyDesc === "string") {
      try { body.companyDesc = JSON.parse(body.companyDesc); }
      catch { body.companyDesc = { [locale]: body.companyDesc }; }
    }
    body.companyDesc = fillAllLocales(body.companyDesc);
  }

  // managers & addresses normalize
  body.managers = normalizeToStringArray(body.managers);
  body.addresses = normalizeAddresses(body.addresses);

  // social links defaults
  body.socialLinks = {
    facebook: body.socialLinks?.facebook || "",
    instagram: body.socialLinks?.instagram || "",
    twitter: body.socialLinks?.twitter || "",
    linkedin: body.socialLinks?.linkedin || "",
    youtube: body.socialLinks?.youtube || "",
  };

  // images
  const images: ICompany["images"] = [];
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

  // primitive + diğer alanlar
  const companyData: any = {};
  for (const field of primitiveFields) {
    if (typeof body[field] !== "undefined") companyData[field] = body[field];
  }
  companyData.companyName = body.companyName;
  companyData.companyDesc = body.companyDesc || {};
  companyData.managers = body.managers;
  companyData.addresses = body.addresses;
  companyData.socialLinks = body.socialLinks;
  companyData.images = images;
  if (body.bankDetails) companyData.bankDetails = body.bankDetails;

  const newCompany = await Company.create(companyData);
  await populateAddresses(newCompany);

  logger.withReq.info(req, t("company.created"), {
    ...getRequestContext(req),
    id: newCompany._id,
  });

  res.status(201).json({
    success: true,
    message: t("company.created"),
    data: newCompany,
  });
});

/* =========================================================
 * UPDATE
 * =======================================================*/
export const updateCompanyInfo = asyncHandler(async (req: Request, res: Response) => {
  req.body = parseNestedFields(req.body);

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

  const updates = req.body || {};

  // Çok dilli alanlar merge
  if (updates.companyName) {
    if (typeof updates.companyName === "string") {
      try { updates.companyName = JSON.parse(updates.companyName); }
      catch { updates.companyName = { [locale]: updates.companyName }; }
    }
    updates.companyName = fillAllLocales(updates.companyName);
    company.companyName = { ...company.companyName, ...updates.companyName };
  }
  if (updates.companyDesc) {
    if (typeof updates.companyDesc === "string") {
      try { updates.companyDesc = JSON.parse(updates.companyDesc); }
      catch { updates.companyDesc = { [locale]: updates.companyDesc }; }
    }
    updates.companyDesc = fillAllLocales(updates.companyDesc);
    company.companyDesc = { ...company.companyDesc, ...updates.companyDesc };
  }

  // primitive alanlar
  for (const field of primitiveFields) {
    if (typeof updates[field] !== "undefined" && updates[field] !== null) {
      (company as any)[field] = updates[field];
    }
  }

  // managers / addresses
  if (typeof updates.managers !== "undefined") {
    company.managers = normalizeToStringArray(updates.managers);
  }
  if (typeof updates.addresses !== "undefined") {
    company.addresses = normalizeAddresses(updates.addresses);
  }

  // socialLinks
  if (updates.socialLinks) {
    company.socialLinks = {
      facebook: updates.socialLinks?.facebook || "",
      instagram: updates.socialLinks?.instagram || "",
      twitter: updates.socialLinks?.twitter || "",
      linkedin: updates.socialLinks?.linkedin || "",
      youtube: updates.socialLinks?.youtube || "",
    };
  }

  // bankDetails merge
  if (updates.bankDetails) {
    company.bankDetails = { ...company.bankDetails, ...updates.bankDetails };
  }

  // yeni resimler
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
      company.images.push({
        url: imageUrl,
        thumbnail,
        webp,
        publicId: (file as any).public_id,
      });
    }
  }

  // silinecek resimler
  if (typeof updates.removedImages !== "undefined") {
    try {
      const removedList =
        Array.isArray(updates.removedImages)
          ? updates.removedImages
          : JSON.parse(updates.removedImages || "[]");

      const toRemove = new Set<string>(removedList.filter(Boolean).map(String));

      for (const imgUrl of toRemove) {
        // Local dosyayı sil
        const localPath = path.join(
          "uploads",
          req.tenant,
          "company-images",
          path.basename(imgUrl)
        );
        if (fs.existsSync(localPath)) {
          try { fs.unlinkSync(localPath); } catch { /* ignore */ }
        }

        // Cloudinary
        const img = company.images.find((img: any) => img.url === imgUrl && img.publicId);
        if (img?.publicId) {
          try {
            await cloudinary.uploader.destroy(img.publicId);
          } catch (err) {
            logger.withReq.error(req, `Cloudinary delete error for ${img.publicId}`, {
              ...getRequestContext(req),
              error: err,
            });
          }
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
  await populateAddresses(company);

  logger.withReq.info(req, t("company.updated"), {
    ...getRequestContext(req),
    id: company._id,
  });

  res.status(200).json({
    success: true,
    message: t("company.updated"),
    data: company,
  });
});

/* =========================================================
 * GET (single by tenant)
 * =======================================================*/
export const getCompanyInfo = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  if (!req.tenant) {
    res.status(400).json({ success: false, message: t("company.tenantRequired") });
    return;
  }

  const { Company } = await getTenantModels(req);

  const company = await Company.findOne({ tenant: req.tenant })
    .select("-__v")
    .populate({ path: "addresses" });

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
});

/* =========================================================
 * DELETE
 * =======================================================*/
export const deleteCompany = asyncHandler(async (req: Request, res: Response) => {
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
    // Local dosya
    const localPath = path.join(
      "uploads",
      req.tenant,
      "company-images",
      path.basename(img.url || "")
    );
    if (fs.existsSync(localPath)) {
      try { fs.unlinkSync(localPath); } catch { /* ignore */ }
    }
    // Cloudinary
    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        logger.withReq.error(req, `Cloudinary delete error for ${img.publicId}`, {
          ...getRequestContext(req),
          error: err,
        });
      }
    }
  }

  await company.deleteOne();

  logger.withReq.info(req, t("company.deleted"), {
    ...getRequestContext(req),
    id,
  });

  res.status(200).json({ success: true, message: t("company.deleted") });
});
