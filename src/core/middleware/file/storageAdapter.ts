import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import fs from "fs";
import slugify from "slugify";
import { UPLOAD_FOLDERS, UploadFolderKeys, BASE_UPLOAD_DIR, resolveUploadPath } from "./uploadMiddleware";

// Cloudinary global config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getCloudinaryFormat = () => process.env.CLOUDINARY_FORMAT || "webp";

/**
 * Tenant-slug helper: Öncelik sırası
 * - req.tenant (runtime, production multi-tenant)
 * - .env'den (dev/local)
 * - "default" fallback
 */
function getTenantSlug(req: any): string {
  return (
    req?.tenant ||
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.NEXT_PUBLIC_TENANT_NAME ||
    process.env.TENANT_NAME ||
    process.env.APP_ENV ||
    "default"
  );
}

/**
 * Storage Adapter (cloudinary veya local)
 * Her ortamda path/folder, aktif tenant slug'a göre belirlenir!
 */
export const storageAdapter = (provider: "local" | "cloudinary") => {
  if (provider === "cloudinary") {
    return new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => {
        const tenantSlug = getTenantSlug(req); // 🔥 En kritik satır!
        const folderKey = req.uploadType as UploadFolderKeys;
        const uploadFolder = UPLOAD_FOLDERS[folderKey] || UPLOAD_FOLDERS.default;
        const nameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");
        const safeName = slugify(nameWithoutExt, { lower: true, strict: true });
        const uniqueName = `${safeName}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        const isImage = file.mimetype.startsWith("image/") && !file.originalname.toLowerCase().endsWith(".pdf");
        return {
          folder: `${process.env.CLOUDINARY_FOLDER}/${tenantSlug}/${uploadFolder}`, // 🔥
          format: isImage ? getCloudinaryFormat() : undefined,
          public_id: uniqueName,
          resource_type: isImage ? "image" : "raw",
        };
      },
    });
  }

  // LOCAL DISK STORAGE
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      const tenantSlug = getTenantSlug(req); // 🔥
      const folderKey = req.uploadType as UploadFolderKeys;
      const uploadFolder = UPLOAD_FOLDERS[folderKey] || UPLOAD_FOLDERS.default;
      const fullPath = path.join(BASE_UPLOAD_DIR, tenantSlug, uploadFolder);
      if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
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
