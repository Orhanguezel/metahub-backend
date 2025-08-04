// src/core/pdf/getLogoBuffer.ts

import fs from "fs";
import axios from "axios";

/**
 * Logo URL veya path'ini buffer'a çevirir.
 */


export async function getLogoBuffer(logoPath?: string): Promise<Buffer | undefined> {
  if (!logoPath) return undefined;
  try {
    if (logoPath.startsWith("http")) {
      // WebP ise PNG linkine çevir
      if (logoPath.endsWith(".webp")) {
        logoPath = logoPath.replace(/\.webp$/, ".png");
      }
      const response = await axios.get(logoPath, { responseType: "arraybuffer" });
      return Buffer.from(response.data, "binary");
    }
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }
    return undefined;
  } catch (err) {
    // console.error("Logo yüklenemedi:", err);
    return undefined;
  }
}
