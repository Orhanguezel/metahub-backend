import sharp from "sharp";
import path from "path";
import fs from "fs";

const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export const generateThumbnails = async (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!imageExts.includes(ext)) {
    console.warn(`[SHARP] File is not an image: ${filePath}`);
    return;
  }

  const baseName = filePath.replace(ext, "");
  const webpPath = `${baseName}.webp`;
  const thumbPath = `${baseName}.thumb${ext}`;

  try {
    await sharp(filePath).resize({ width: 300 }).toFile(thumbPath);
    console.log(`[SHARP] Thumbnail created : ${thumbPath}`);
    await sharp(filePath).toFormat("webp").toFile(webpPath);
    console.log(`[SHARP] WebP created: ${webpPath}`);
  } catch (error) {
    console.error(`[SHARP] Thumbnail/WebP error: ${error}`);
    throw error;
  }
};
