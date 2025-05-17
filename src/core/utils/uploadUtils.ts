import path from "path";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import sharp from "sharp";
import fs from "fs";

/**
 * Process local image to generate thumbnail and webp.
 */
export async function processImageLocal(inputPath: string, filename: string, folder: string) {
  const thumbnailDir = path.join(folder, "thumbnails");
  const webpDir = path.join(folder, "webp");

  if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir, { recursive: true });
  if (!fs.existsSync(webpDir)) fs.mkdirSync(webpDir, { recursive: true });

  const thumbPath = path.join(thumbnailDir, filename);
  const webpFilename = filename.replace(path.extname(filename), ".webp");
  const webpPath = path.join(webpDir, webpFilename);

  await sharp(inputPath).resize(300, 200).toFile(thumbPath);
  await sharp(inputPath).webp().toFile(webpPath);

  return {
    thumbnail: `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/thumbnails/${filename}`,
    webp: `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/webp/${webpFilename}`,
  };
}

/**
 * Returns correct image URL depending on storage provider.
 */
export function getImagePath(file: Express.Multer.File) {
  const storageProvider = process.env.STORAGE_PROVIDER || "local";
  return storageProvider === "cloudinary"
    ? (file as any).path
    : `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/${file.filename}`;
}

/**
 * Returns true if image processing (sharp) should run.
 */
export function shouldProcessImage() {
  return (process.env.STORAGE_PROVIDER || "local") === "local";
}

/**
 * Provides fallback thumbnail and webp URLs to prevent schema validation errors.
 */
export function getFallbackThumbnail(imagePath: string) {
  return {
    thumbnail: imagePath,
    webp: imagePath,
  };
}
