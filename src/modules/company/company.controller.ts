import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
//import { Company } from "@/modules/company";
import { isValidObjectId } from "@/core/utils/validation";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/utils/uploadUtils";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";

// Çoklu resim işleme yardımcı fonksiyonu
async function processUploadedImages(files: Express.Multer.File[]) {
  const images = [];
  for (const file of files) {
    const imageUrl = getImagePath(file);
    let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
    let publicId = (file as any).public_id;
    if (shouldProcessImage()) {
      const processed = await processImageLocal(
        file.path,
        file.filename,
        path.dirname(file.path)
      );
      thumbnail = processed.thumbnail;
      webp = processed.webp;
    }
    images.push({ url: imageUrl, thumbnail, webp, publicId });
  }
  return images;
}

// ✅ Şirket bilgisi oluştur (çoklu logo)
export const createCompany = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { Company } = await getTenantModels(req);
    const exists = await Company.findOne({ tenant: req.tenant });
    if (exists) {
      res
        .status(400)
        .json({ success: false, message: "A company is already registered." });
      return;
    }
    const body = req.body;

    // Sosyal linkler için default objesi
    body.socialLinks = {
      facebook: body.socialLinks?.facebook || "",
      instagram: body.socialLinks?.instagram || "",
      twitter: body.socialLinks?.twitter || "",
      linkedin: body.socialLinks?.linkedin || "",
      youtube: body.socialLinks?.youtube || "",
    };

    let logos: any[] = [];
    if (Array.isArray(req.files)) {
      logos = await processUploadedImages(req.files as Express.Multer.File[]);
    }
    body.logos = logos;

    const newCompany = await Company.create(body);

    res.status(201).json({
      success: true,
      message: "Company created successfully.",
      data: newCompany,
    });
  }
);

// ✅ Şirket bilgisi güncelle (çoklu logo ve silme desteği)
export const updateCompanyInfo = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { Company } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid company ID." });
      return;
    }

    const company = await Company.findOne({ _id: id, tenant: req.tenant });
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found." });
      return;
    }

    const updates = req.body;
    updates.socialLinks = {
      facebook: updates.socialLinks?.facebook || "",
      instagram: updates.socialLinks?.instagram || "",
      twitter: updates.socialLinks?.twitter || "",
      linkedin: updates.socialLinks?.linkedin || "",
      youtube: updates.socialLinks?.youtube || "",
    };

    // Yeni eklenen logolar
    if (Array.isArray(req.files)) {
      const newImages = await processUploadedImages(
        req.files as Express.Multer.File[]
      );
      company.logos.push(...newImages);
    }

    // Silinmek istenen logolar
    if (updates.removedLogos) {
      try {
        const removed: string[] = JSON.parse(updates.removedLogos);
        // Kalan logoları filtrele
        company.logos = company.logos.filter(
          (img: any) => !removed.includes(img.url)
        );
        // Fiziksel dosyaları ve Cloudinary'den sil
        for (const imgUrl of removed) {
          const filename = path.basename(imgUrl);
          const localPath = path.join("uploads", "company-images", filename);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          // Cloudinary
          const match = company.logos.find(
            (img: any) => img.url === imgUrl && img.publicId
          );
          if (match && match.publicId) {
            await cloudinary.uploader.destroy(match.publicId);
          }
        }
      } catch (e) {
        console.warn("Invalid removedLogos JSON:", e);
      }
    }

    // Diğer alanlar
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== "removedLogos") {
        (company as any)[key] = value;
      }
    });

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company info updated.",
      data: company,
    });
  }
);

// ✅ Şirket bilgisini getir (çoklu logo ile)
// ✅ Şirket bilgisini getir (çoklu logo ile, log destekli)
export const getCompanyInfo = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { Company } = await getTenantModels(req);
    const tenantSlug = req.tenant;
    const logContext = {
      ...req.headers,
      tenant: tenantSlug,
      module: "company",
      event: "company.getInfo",
      host: req.hostname,
      ip: req.ip,
      userId: (req as any).user?._id || null,
    };

    // [DEBUG] Model ve tenant ile ilgili log (isteğe bağlı)
    logger.info("[COMPANY] getCompanyInfo endpoint called", {
      ...logContext,
      status: "start",
    });

    try {
      const company = await Company.findOne({ tenant: tenantSlug }).select(
        "-__v"
      );

      if (!company) {
        logger.warn("[COMPANY] No company info found", {
          ...logContext,
          status: "not_found",
        });
        res.status(404).json({
          success: false,
          message: "Company information not found.",
        });
        return;
      }

      logger.info("[COMPANY] Company info fetched successfully", {
        ...logContext,
        status: "success",
        companyId: company._id?.toString(),
      });

      res.status(200).json({
        success: true,
        data: company,
      });
    } catch (err: any) {
      logger.error("[COMPANY] Company info fetch error", {
        ...logContext,
        status: "error",
        error: err?.message || err,
      });
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching company information.",
        detail: err?.message || err,
      });
    }
  }
);

// ✅ Şirket bilgisini sil (ve logoları da siler)
export const deleteCompany = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { Company } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid company ID." });
      return;
    }

    const company = await Company.findOne({ _id: id, tenant: req.tenant });
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found." });
      return;
    }

    // Tüm logoları sil
    for (const img of company.logos || []) {
      const localPath = path.join(
        "uploads",
        "company-images",
        path.basename(img.url)
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
          console.error(`Cloudinary delete error for ${img.publicId}:`, err);
        }
      }
    }

    await company.deleteOne();

    res.status(200).json({ success: true, message: "Company deleted." });
  }
);
