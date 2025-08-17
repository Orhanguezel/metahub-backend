// src/core/middleware/file/uploadUtils.ts

import path from "path";
import { BASE_URL, getTenantSlug, resolveUploadPath } from "./uploadMiddleware";
import sharp from "sharp";
import fs from "fs";

/**
 * Process local image to generate thumbnail and webp.
 * @param inputPath - Kaynak dosyanın tam yolu
 * @param filename - Kaydedilecek dosya adı
 * @param folder - (Mutlaka tenant dahil tam yol!) Yani: uploads/<tenant>/<modul-folder>
 * @param tenantSlug - runtime'da aktif tenant slug (opsiyonel)
 */
export async function processImageLocal(
  inputPath: string,
  filename: string,
  folder: string,
  tenantSlug?: string // eklenebilir, dinamik path için!
) {
  try {
    const thumbnailDir = path.join(folder, "thumbnails");
    const webpDir = path.join(folder, "webp");

    if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir, { recursive: true });
    if (!fs.existsSync(webpDir)) fs.mkdirSync(webpDir, { recursive: true });

    const thumbPath = path.join(thumbnailDir, filename);
    const webpFilename = filename.replace(path.extname(filename), ".webp");
    const webpPath = path.join(webpDir, webpFilename);

    await sharp(inputPath).resize(300, 200).toFile(thumbPath);
    await sharp(inputPath).webp().toFile(webpPath);

    // 🔥 Thumbnail/webp url’sini tenant’a göre kur
    // uploads/<tenant>/<folder>/thumbnails/<filename>
    // ör: uploads/ensotek/about-images/thumbnails/abc.jpg
    const tenant = tenantSlug || getTenantSlug(); // env veya req üzerinden alınmalı
    const basePath = `uploads/${tenant}/${path.basename(folder)}`;
    return {
      thumbnail: `${BASE_URL}/${basePath}/thumbnails/${filename}`,
      webp: `${BASE_URL}/${basePath}/webp/${webpFilename}`,
    };
  } catch (error) {
    console.error(`[processImageLocal] Image processing failed for ${inputPath}:`, error);
    // Fallback url'ler ile dönelim
    return {
      thumbnail: `${BASE_URL}/default-thumbnail.png`,
      webp: `${BASE_URL}/default-thumbnail.webp`,
    };
  }
}

/**
 * Dosyanın erişim URL’sini döndürür, her zaman tenant’a göre!
 * @param file - Express.Multer.File
 * @param folder - Sadece module folder (ör: "about-images")
 * @param tenantSlug - runtime’da aktif tenant
 */
export function getImagePath(
  file: Express.Multer.File,
  folder: string = "gallery",
  tenantSlug?: string
) {
  const storageProvider = process.env.STORAGE_PROVIDER || "local";
  const tenant = tenantSlug || getTenantSlug();
  if (storageProvider === "cloudinary") {
    // Cloudinary: her zaman url varsa onu döndür
    console.log("[getImagePath][cloudinary] file.path:", (file as any).path, "file.url:", (file as any).url);
    return (file as any).url || (file as any).path;
  }
  // Local: uploads/<tenant>/<folder>/<file.filename>
  return `${BASE_URL}/uploads/${tenant}/${folder}/${file.filename}`;
}

export function shouldProcessImage() {
  return (process.env.STORAGE_PROVIDER || "local") === "local";
}

export function getFallbackThumbnail(imagePath: string) {
  return {
    thumbnail: imagePath,
    webp: imagePath,
  };
}
