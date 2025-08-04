// src/core/pdf/uploadBufferToCloudinary.ts

import { v2 as cloudinary } from "cloudinary";

/**
 * Buffer’dan PDF'i Cloudinary'ye yükler ve url döner.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  opts: {
    folder: string;
    public_id: string;
    resource_type?: "raw" | "image" | "auto";
  }
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.public_id,
        resource_type: opts.resource_type || "raw",
        format: "pdf",
        overwrite: true,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
