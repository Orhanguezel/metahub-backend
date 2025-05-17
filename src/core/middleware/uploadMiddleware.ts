import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { Request } from "express";
import slugify from "slugify";
import { storageAdapter } from "./storageAdapter";

const envProfile = process.env.APP_ENV || "ensotek";
const provider = process.env.STORAGE_PROVIDER as "local" | "cloudinary" || "local";

export const BASE_UPLOAD_DIR = "uploads";
export const BASE_URL_VALUE = process.env.BASE_URL || "http://localhost:5014";
export const CURRENT_PROJECT = envProfile;

export const UPLOAD_FOLDERS = {
  profile: "profile-images",
  product: "product-images",
  ensotekprod: "ensotekprod-images",
  radonarprod: "radonarprod-images",
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
  spareparts: "spareparts-images",
  setting: "setting-images",
  company: "company-images",
  about: "about-images",
  default: "misc",
} as const;

export type UploadFolderKeys = keyof typeof UPLOAD_FOLDERS;

export const resolveUploadPath = (type: string): string =>
  path.join(BASE_UPLOAD_DIR, CURRENT_PROJECT, type);

// 💥 Fix: ensure folder is a string
Object.values(UPLOAD_FOLDERS).forEach((folder) => {
  const fullPath = resolveUploadPath(String(folder));
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".docx", ".pptx"];
const allowedMimeTypes = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  console.log("Checking file:", file.originalname, file.mimetype, fileExtension);

  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(fileExtension)) {
    console.warn(`Unsupported file type or extension: ${file.originalname}`);
    return cb(new Error(`Unsupported file type or extension: ${file.originalname}`));
  }
  cb(null, true);
};

const upload = multer({
  storage: storageAdapter(provider),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
});

export const serveUploads = express.static(BASE_UPLOAD_DIR);
export const UPLOAD_BASE_PATH = `${BASE_UPLOAD_DIR}/${envProfile}`;
export { BASE_URL_VALUE as BASE_URL }; // 💥 renamed to avoid default export conflict
export default upload;
