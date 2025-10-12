import type { UploadApiResponse, UploadApiOptions } from "cloudinary";
import cloudinary from "./cloudinary";

type UploadInput = {
  buffer: Buffer;
  mimetype?: string;
  filename?: string;
  folder?: string;      // opsiyonel, tenant bazlı klasör
  eager?: UploadApiOptions["eager"];
  resourceType?: "image" | "auto" | "video" | "raw";
};

export async function uploadBufferToCloudinary(input: UploadInput): Promise<UploadApiResponse> {
  const { buffer, mimetype, filename, folder, eager, resourceType = "auto" } = input;
  if (!cloudinary.config().cloud_name) throw new Error("cloudinary_not_configured");

  const streamUpload = () =>
    new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: filename?.replace(/\.[^.]+$/, "")?.slice(0, 255),
          use_filename: !!filename,
          unique_filename: !filename,
          overwrite: false,
          eager,
        },
        (err, result) => (err ? reject(err) : resolve(result as UploadApiResponse))
      );
      upload.end(buffer);
    });

  return streamUpload();
}

export async function deleteFromCloudinary(publicId: string, resourceType: "image" | "video" | "raw" | "auto" = "image") {
  if (!cloudinary.config().cloud_name) return { result: "skipped" as const };
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export function buildTenantFolder(tenant: string) {
  const base = process.env.CLOUDINARY_FOLDER || "metahub";
  return `${base}/${tenant}`;
}
