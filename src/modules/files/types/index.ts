import type { Types } from "mongoose";

export type FileKind = "image" | "pdf" | "doc" | "other";
export type StorageProvider = "local" | "s3" | "cloudinary" | "other";

export interface IFileVersion {
  kind: "original" | "thumbnail" | "webp" | "preview";
  url: string;
  width?: number;
  height?: number;
  size?: number;          // bytes
  mime?: string;
  publicId?: string;      // cloudinary vb.
}

export interface IFileLink {
  module: string;         // "apartment" | "contract" | ...
  refId: Types.ObjectId;  // ilgili doküman
}

export interface IFileObject {
  _id?: Types.ObjectId;

  tenant: string;
  kind: FileKind;               // image/pdf/...
  provider: StorageProvider;    // storageAdapter ile
  filename: string;             // orijinal ad
  mime: string;
  ext?: string;
  size: number;                 // bytes
  checksum?: string;            // dedup için opsiyonel

  // ana erişim
  url: string;                  // original public URL (veya signed)
  publicId?: string;            // cloudinary vb.

  // varyantlar
  versions: IFileVersion[];     // thumbnail/webp/preview

  // referanslar
  links: IFileLink[];           // çoklu link
  tags: string[];

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
