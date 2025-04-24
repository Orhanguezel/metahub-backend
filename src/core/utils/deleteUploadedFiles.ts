// src/utils/deleteUploadedFiles.ts

import fs from "fs";
import path from "path";
import { UPLOAD_FOLDERS, UPLOAD_BASE_PATH } from "../middleware/uploadMiddleware";

export const deleteUploadedFiles = (
  imageUrls: string[],
  folderKey: keyof typeof UPLOAD_FOLDERS
): void => {
  const uploadFolder = UPLOAD_FOLDERS[folderKey];
  const baseDir = path.join(UPLOAD_BASE_PATH, uploadFolder);

  imageUrls.forEach((imgUrl) => {
    const filename = path.basename(imgUrl); 
    const fullPath = path.join(baseDir, filename); 

    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log("🗑️ Deleted file:", fullPath);
      } catch (err) {
        console.error("❌ Error deleting file:", fullPath, err);
      }
    } else {
      console.warn("⚠️ File not found to delete:", fullPath);
    }
  });
};
