import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { Request } from "express";
import dotenv from "dotenv";

dotenv.config();

const BASE_UPLOAD_DIR = "uploads";
const BASE_URL = process.env.BASE_URL || "http://localhost:5015";

// 🔁 Kullanılan tüm upload klasörleri
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
  default: "misc", // 🟢 fallback olarak güvenli klasör
} as const;

type UploadFolderKeys = keyof typeof UPLOAD_FOLDERS;

// 📁 Gerekli klasörleri oluştur
Object.values(UPLOAD_FOLDERS).forEach((folder) => {
  const fullPath = path.join(BASE_UPLOAD_DIR, folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// 📂 Dosya depolama ayarı
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folderKey = req.uploadType as UploadFolderKeys;
    const uploadFolder = UPLOAD_FOLDERS[folderKey] || UPLOAD_FOLDERS.default;
    const fullPath = path.join(BASE_UPLOAD_DIR, uploadFolder);

    // ✅ Hata öncesi log
    if (!uploadFolder) {
      console.error("❌ No upload folder found for:", req.uploadType);
      return cb(new Error("Upload folder not defined."), "");
    }

    cb(null, fullPath);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// 📌 Desteklenen MIME türleri (görseller + belgeler)
const allowedMimeTypes = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  console.log("🧾 Checking file:", file.originalname, file.mimetype);

  if (!file || !file.mimetype) {
    console.warn("❌ Missing file or mimetype");
    return cb(new Error("File or mimetype is missing"));
  }
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.warn(`❌ Unsupported file type: ${file.originalname} (${file.mimetype})`);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
  
};

// 🎯 Multer yapılandırması
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter,
});

// 🌐 Statik dosya servisi
export const serveUploads = express.static(BASE_UPLOAD_DIR);
export { BASE_URL, UploadFolderKeys };
export default upload;
