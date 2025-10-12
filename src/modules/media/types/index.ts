import type { Document } from "mongoose";

export interface IMediaAsset extends Document {
  tenant: string;
  publicId?: string;     // cloudinary/s3 key
  url: string;
  thumbnail?: string;
  webp?: string;
  width?: number;
  height?: number;
  mime?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
