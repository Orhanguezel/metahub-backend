import sharp from "sharp";
import path from "path";

export const generateThumbnails = async (filePath: string) => {
  const ext = path.extname(filePath);
  const baseName = filePath.replace(ext, "");
  const webpPath = `${baseName}.webp`;
  const thumbPath = `${baseName}.thumb${ext}`;

  try {
    await sharp(filePath)
      .resize({ width: 300 })
      .toFile(thumbPath);

    console.log(`Thumbnail created : ${thumbPath}`);
    await sharp(filePath)
      .toFormat("webp")
      .toFile(webpPath);

    console.log(`WebP created: ${webpPath}`);
  } catch (error) {
    console.error(`❌ Thumbnail/WebP hatası: ${error}`);
    throw error;
  }
};
