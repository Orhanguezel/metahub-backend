import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import slugify from "slugify";
import { UPLOAD_FOLDERS, UploadFolderKeys, CURRENT_PROJECT, resolveUploadPath } from "./uploadMiddleware";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getCloudinaryFormat = () =>
  process.env.CLOUDINARY_FORMAT || "webp";

export const storageAdapter = (provider: "local" | "cloudinary") => {
  if (provider === "cloudinary") {
    return new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => {
        const folderKey = req.uploadType as UploadFolderKeys;
        const uploadFolder = UPLOAD_FOLDERS[folderKey] || UPLOAD_FOLDERS.default;
        const nameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");
        const safeName = slugify(nameWithoutExt, { lower: true, strict: true });
        const uniqueName = `${safeName}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        // Önemli: Dosya tipi kontrolü
        const isImage = file.mimetype.startsWith("image/") && !file.originalname.toLowerCase().endsWith(".pdf");
        // "pdf", "docx", "pptx", "xlsx" gibi diğer dokümanlar için resource_type: "raw"
        return {
          folder: `${process.env.CLOUDINARY_FOLDER}/${CURRENT_PROJECT}/${uploadFolder}`,
          format: isImage ? getCloudinaryFormat() : undefined,
          public_id: uniqueName,
          resource_type: isImage ? "image" : "raw", // 🔴 PDF ve dokümanlar için "raw"
        };
      },
    });
  }

  // Local fallback
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      const folderKey = req.uploadType as UploadFolderKeys;
      const uploadFolder = UPLOAD_FOLDERS[folderKey] || UPLOAD_FOLDERS.default;
      const fullPath = resolveUploadPath(uploadFolder);
      cb(null, fullPath);
    },
    filename: (_req, file, cb) => {
      const nameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");
      const safeName = slugify(nameWithoutExt, { lower: true, strict: true });
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${safeName}-${uniqueSuffix}${ext}`);
    },
  });
};
