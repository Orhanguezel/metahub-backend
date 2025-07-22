import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { Request } from "express";
import slugify from "slugify";
import { storageAdapter } from "./storageAdapter";
import { uploadSizeLimits } from "./uploadTypeWrapper";

// 🌍 Environment-based values (already loaded via env.ts)
const envProfile = process.env.APP_ENV;
const provider = process.env.STORAGE_PROVIDER as "local" | "cloudinary";
const baseUrl = process.env.BASE_URL;
const uploadRoot = process.env.UPLOAD_ROOT || "uploads";

// ❗ Required variable check
if (!envProfile) throw new Error("APP_ENV is not defined. Please set it via your environment configuration.");
if (!provider) throw new Error("STORAGE_PROVIDER is not defined in your environment.");
if (!baseUrl) throw new Error("BASE_URL is not defined in your environment.");

export const BASE_UPLOAD_DIR = uploadRoot;
export const BASE_URL_VALUE = baseUrl;
export const CURRENT_PROJECT = envProfile;

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

  default: "misc",
} as const;

export type UploadFolderKeys = keyof typeof UPLOAD_FOLDERS;

export const resolveUploadPath = (type: string): string =>
  path.join(BASE_UPLOAD_DIR, CURRENT_PROJECT, type);

// 📁 Auto-create directories if not exist
Object.values(UPLOAD_FOLDERS).forEach((folder) => {
  const fullPath = resolveUploadPath(String(folder));
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// ✅ Dosya uzantısı ve mimetype kontrolü
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
 * Dinamik upload middleware.
 * Her tip için uygun dosya boyutu limiti otomatik uygulanır.
 */
export const upload = (type: UploadFolderKeys) => {
  return multer({
    storage: storageAdapter(provider),
    limits: { fileSize: uploadSizeLimits[type] || uploadSizeLimits.default },
    fileFilter,
  });
};

export const serveUploads = express.static(BASE_UPLOAD_DIR);
export const UPLOAD_BASE_PATH = `${BASE_UPLOAD_DIR}/${envProfile}`;
export { BASE_URL_VALUE as BASE_URL};
