import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { NextFunction, Response, Request } from "express";
import dotenv from "dotenv";

// ✅ .env ortam değişkenlerini APP_ENV'e göre yükle
const envProfile = process.env.APP_ENV || "metahub";
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${envProfile}`),
});

// 🌐 Temel ayarlar
const BASE_UPLOAD_DIR = "uploads";
const BASE_URL = process.env.BASE_URL || "http://localhost:5014";
const CURRENT_PROJECT = envProfile; // klasör ayrımı için

// 🔁 Klasör tanımları
export const UPLOAD_FOLDERS = {
  profile: "profile-images",
  product: "product-images",
  category: "category-images",
  news: "news-images",
  article: "article-images",
  blog: "blog-images",
  gallery: "gallery",
  service: "service-images",
  library: "library",
  references: "references",
  sport: "sport-images",
  spareparts: "spareparts-images",
  setting: "setting-images",
  default: "misc",
} as const;

export type UploadFolderKeys = keyof typeof UPLOAD_FOLDERS;

// 📁 Klasör yolu hesaplama: uploads/<proje>/<kategori>
const resolveUploadPath = (type: string) =>
  path.join(BASE_UPLOAD_DIR, CURRENT_PROJECT, type);

// 📁 Gerekli klasörleri oluştur
Object.values(UPLOAD_FOLDERS).forEach((folder) => {
  const fullPath = resolveUploadPath(folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// ✅ MIME türleri
const allowedMimeTypes = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

// ✅ Dosya filtreleme
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  console.log("🧾 Checking file:", file.originalname, file.mimetype);
  if (!file?.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
    console.warn(`❌ Unsupported file type: ${file?.originalname}`);
    return cb(new Error(`Unsupported file type: ${file?.mimetype}`));
  }
  cb(null, true);
};

// ✅ Genel storage (fallback için)
const globalStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folderKey = req.uploadType as UploadFolderKeys;
    const uploadFolder = UPLOAD_FOLDERS[folderKey] || UPLOAD_FOLDERS.default;
    const fullPath = resolveUploadPath(uploadFolder);
    console.log(`✅ [GLOBAL UPLOADER] Resolved path: ${fullPath}`);
    cb(null, fullPath);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: globalStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
});

// ✅ Yeni helper middleware: uploadTypeWrapper
export const uploadTypeWrapper = (type: UploadFolderKeys) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = type;
    console.log(`🛠 [UPLOAD TYPE WRAPPER] req.uploadType set edildi: ${type}`);
    next();
  };
};


// 🌐 Statik dosya servisi (örnek: localhost:5014/uploads/metahub/...)
export const serveUploads = express.static(BASE_UPLOAD_DIR);
export { BASE_URL };
export const UPLOAD_BASE_PATH = `${BASE_UPLOAD_DIR}/${envProfile}`;
export default upload;


