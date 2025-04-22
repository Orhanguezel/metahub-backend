// src/utils/fileUtils.ts

import fs from "fs";
import path from "path";

/**
 * Verilen dosya yolu geçerliyse siler
 */
export const safelyDeleteFile = (relativePath: string): void => {
  const fullPath = path.join(process.cwd(), relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
