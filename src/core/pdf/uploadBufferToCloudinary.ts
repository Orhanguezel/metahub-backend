// src/core/pdf/uploadBufferToCloudinary.ts
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

function ensureConfigured() {
  const cfg = cloudinary.config();
  if (!cfg.cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

/**
 * PDF buffer -> Cloudinary (RAW)
 * - resource_type: "raw"
 * - public_id: mutlaka ".pdf" ile bitmeli
 * - format parametresi VERME!
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  opts: {
    folder: string;
    public_id: string;               // ör: "offer_123.pdf"
    resource_type?: "raw" | "image" | "auto";
    tags?: string[];
    context?: Record<string, string>;
  }
): Promise<string> {
  ensureConfigured();
  const cfg = cloudinary.config();
  if (!cfg.cloud_name) throw new Error("Cloudinary is not configured");

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.public_id,                // .pdf UZANTILI
        resource_type: opts.resource_type || "raw",
        type: "upload",
        access_mode: "public",
        overwrite: true,
        tags: opts.tags,
        context: opts.context,
        // format VERME!
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) return reject(error);
        const url = result?.secure_url || result?.url;
        if (!url) return reject(new Error("Cloudinary upload failed (no URL)"));
        resolve(url);
      }
    );
    stream.end(buffer);
  });
}
