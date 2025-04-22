// src/utils/deleteUploadedFiles.ts

import fs from "fs";
import path from "path";
import { BASE_URL, UPLOAD_FOLDERS } from "../middleware/uploadMiddleware";

export const deleteUploadedFiles = (imageUrls: string[], folderKey: keyof typeof UPLOAD_FOLDERS) => {
  const uploadFolder = UPLOAD_FOLDERS[folderKey];

  imageUrls.forEach((imgUrl) => {
    const filename = path.basename(imgUrl); // sadece dosya adı
    const fullPath = path.join("uploads", uploadFolder, filename); // klasör + dosya

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log("🗑️ Deleted file:", fullPath);
    } else {
      console.warn("⚠️ File not found to delete:", fullPath);
    }
  });
};
