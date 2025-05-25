import path from "path";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import sharp from "sharp";
import fs from "fs";

/**
 * Process local image to generate thumbnail and webp.
 */
export async function processImageLocal(inputPath: string, filename: string, folder: string) {
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

    return {
      thumbnail: `${BASE_URL}/${UPLOAD_BASE_PATH}/${folder}/thumbnails/${filename}`,
      webp: `${BASE_URL}/${UPLOAD_BASE_PATH}/${folder}/webp/${webpFilename}`,
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

export function getImagePath(file: Express.Multer.File, folder: string = "gallery") {
  const storageProvider = process.env.STORAGE_PROVIDER || "local";
  return storageProvider === "cloudinary"
    ? (file as any).path
    : `${BASE_URL}/${UPLOAD_BASE_PATH}/${folder}/${file.filename}`;
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



