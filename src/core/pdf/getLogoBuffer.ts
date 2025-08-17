import fs from "fs";
import axios from "axios";

/** data:URI desteği */
function fromDataUrl(dataUrl: string): Buffer | undefined {
  try {
    const m = dataUrl.match(/^data:(.+?);base64,(.+)$/i);
    if (!m) return undefined;
    return Buffer.from(m[2], "base64");
  } catch {
    return undefined;
  }
}

/**
 * Logo URL ya da dosya yolunu Buffer'a çevirir.
 * - HTTP(S) isteklerinde zaman aşımı ve boyut sınırı var.
 * - .webp uzantısı otomatik .png'ye çevrilir (uyum için).
 * - data:URI desteklenir.
 */
export async function getLogoBuffer(logoPath?: string): Promise<Buffer | undefined> {
  if (!logoPath) return undefined;

  try {
    // data:URI
    if (logoPath.startsWith("data:")) {
      return fromDataUrl(logoPath);
    }

    // HTTP(S)
    if (logoPath.startsWith("http")) {
      if (logoPath.endsWith(".webp")) {
        logoPath = logoPath.replace(/\.webp$/i, ".png");
      }
      const res = await axios.get<ArrayBuffer>(logoPath, {
        responseType: "arraybuffer",
        timeout: 10_000,
        maxContentLength: 8 * 1024 * 1024, // 8MB
        headers: { Accept: "image/*" },
        validateStatus: (s) => s >= 200 && s < 400,
      });
      return Buffer.from(res.data);
    }

    // Yerel dosya
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }

    return undefined;
  } catch {
    return undefined;
  }
}
