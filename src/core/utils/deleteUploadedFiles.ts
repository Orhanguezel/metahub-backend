// src/utils/deleteUploadedFiles.ts

import fs from "fs";
import path from "path";
import { UPLOAD_FOLDERS, UPLOAD_BASE_PATH } from "../middleware/uploadMiddleware";

/**
 * Deletes uploaded files (main, thumbnail, webp) for a given folderKey.
 * Also logs each operation and handles errors gracefully.
 */
export const deleteUploadedFiles = (
  imageUrls: string[],
  folderKey: keyof typeof UPLOAD_FOLDERS
): void => {
  const uploadFolder = UPLOAD_FOLDERS[folderKey];
  const baseDir = path.join(UPLOAD_BASE_PATH, uploadFolder);

  imageUrls.forEach((imgUrl) => {
    const filename = path.basename(imgUrl);

    // Silinecek farklı format/thumbnail yolları
    const possiblePaths = [
      path.join(baseDir, filename), // Ana dosya
      path.join(baseDir, "thumbnails", filename), // Thumbnail
      path.join(baseDir, "webp", filename.replace(path.extname(filename), ".webp")), // WebP
    ];

    possiblePaths.forEach((fullPath) => {
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          console.log("🗑️ Deleted file:", fullPath);
        } catch (err) {
          console.error("❌ Error deleting file:", fullPath, err);
        }
      } else {
        // Sadece ana dosya için uyarı, thumbnail/webp eksikse uyarı vermeye gerek yok
        if (fullPath === possiblePaths[0])
          console.warn("⚠️ File not found to delete:", fullPath);
      }
    });
  });
};
