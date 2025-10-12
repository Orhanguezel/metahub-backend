import { Schema, model, models, type Model } from "mongoose";
import type { IMediaAsset } from "./types";

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    tenant:   { type: String, required: true, index: true },
    publicId: { type: String, trim: true },
    url:      { type: String, required: true, trim: true },
    thumbnail:{ type: String, trim: true },
    webp:     { type: String, trim: true },
    width:    Number,
    height:   Number,
    mime:     String,
    tags:     { type: [String], default: [] },
  },
  { timestamps: true }
);

MediaAssetSchema.index({ tenant: 1, publicId: 1 }, { unique: true, sparse: true });
MediaAssetSchema.index({ tenant: 1, "tags": 1, createdAt: -1 });

export const MediaAsset: Model<IMediaAsset> =
  models.mediaasset || model<IMediaAsset>("mediaasset", MediaAssetSchema);

export default MediaAsset;
