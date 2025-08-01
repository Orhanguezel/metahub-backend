import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { Request } from "express";
import slugify from "slugify";
import { storageAdapter } from "./storageAdapter";
import { uploadSizeLimits } from "./uploadTypeWrapper";

// --- Upload klasörleri ---
export const UPLOAD_FOLDERS = {
  profile: "profile-images",
  product: "product-images",
  ensotekprod: "ensotekprod-images",
  ensotekCategory: "ensotekCategory-images",
  bikes: "bikes-images",
  bikesCategory: "bikesCategory-images",
  category: "category-images",
  news: "news-images",
  articles: "articles-images",
  blog: "blog-images",
  gallery: "gallery",
  services: "service-images",
  massage: "massage-images",
  activity: "activity-images",
  library: "library",
  references: "references",
  sport: "sport-images",
  sparepart: "spareparts-images",
  settings: "settings-images",
  company: "company-images",
  about: "about-images",
  apartment: "apartment-images",
  tenant: "tenant-images",
  coupons: "coupons-images",
  galleryCategory: "galleryCategory-images",
  sparepartCategory: "sparepartCategory-images",
  team: "team-images",
  portfolio: "portfolio-images",
  skill: "skill-images",
  default: "misc",
} as const;

export type UploadFolderKeys = keyof typeof UPLOAD_FOLDERS;

// 🌍 Base dirs
export const BASE_UPLOAD_DIR = process.env.UPLOAD_ROOT || "uploads";
export const BASE_URL_VALUE = process.env.BASE_URL || "http://localhost:5019";

// 🔥 Tenant slug helper (req.tenant öncelik)
export function getTenantSlug(req?: any): string {
  return (
    req?.tenant ||
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.NEXT_PUBLIC_TENANT_NAME ||
    process.env.TENANT_NAME ||
    process.env.APP_ENV ||
    "default"
  );
}

// Dinamik upload path tenant’a göre:
export const resolveUploadPath = (type: string, req?: any): string => {
  const tenant = getTenantSlug(req);
  return path.join(BASE_UPLOAD_DIR, tenant, type);
};

// 📁 Sunucu ilk açılışta local geliştirmede tüm tenant için default dizinler (isteğe bağlı)
if (process.env.NODE_ENV !== "production") {
  Object.values(UPLOAD_FOLDERS).forEach((folder) => {
    const fullPath = resolveUploadPath(String(folder));
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

// --- Dosya uzantı ve mime kontrolü ---
const allowedExtensions = [
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".docx", ".pptx",
];
const allowedMimeTypes = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword", "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (
    !allowedMimeTypes.includes(file.mimetype) ||
    !allowedExtensions.includes(fileExtension)
  ) {
    console.warn(`[UPLOAD] Unsupported file type or extension: ${file.originalname}`);
    return cb(new Error(`Unsupported file type or extension: ${file.originalname}`));
  }
  cb(null, true);
};

/**
 * Dinamik upload middleware (tenant-slug guaranteed)
 */
export const upload = (type: UploadFolderKeys) => {
  return multer({
    storage: storageAdapter(process.env.STORAGE_PROVIDER as "local" | "cloudinary"),
    limits: { fileSize: uploadSizeLimits[type] || uploadSizeLimits.default },
    fileFilter,
  });
};

export const serveUploads = express.static(BASE_UPLOAD_DIR);
// runtime’da tenant’a göre kullanılmalı, ör: /uploads/ensotek/about-images/...
export { BASE_URL_VALUE as BASE_URL };

// 🔥 Export getTenantSlug VE resolveUploadPath fonksiyonlarını,
// storageAdapter ve diğer fonksiyonlar da **her zaman** tenant’a göre path kurar!
// Yani backend’in her yerinde tenant isolation garanti!
