import { Schema, Model, models, model } from "mongoose";
import type { IFileObject } from "./types";

const FileVersionSchema = new Schema(
  {
    kind: { type: String, enum: ["original", "thumbnail", "webp", "preview"], required: true },
    url: { type: String, required: true },
    width: Number,
    height: Number,
    size: Number,
    mime: String,
    publicId: String,
  },
  { _id: false }
);

const FileLinkSchema = new Schema(
  {
    module: { type: String, required: true, trim: true },
    refId: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false }
);

export const FileObjectSchema = new Schema<IFileObject>(
  {
    tenant: { type: String, required: true, index: true },
    kind: { type: String, enum: ["image", "pdf", "doc", "other"], required: true },
    provider: { type: String, enum: ["local", "s3", "cloudinary", "other"], required: true },

    filename: { type: String, required: true, trim: true },
    mime: { type: String, required: true },
    ext: { type: String },
    size: { type: Number, required: true, min: 0 },
    checksum: { type: String },

    url: { type: String, required: true },
    publicId: { type: String },

    versions: { type: [FileVersionSchema], default: [] },
    links: { type: [FileLinkSchema], default: [] },
    tags: [{ type: String, trim: true }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FileObjectSchema.index({ tenant: 1, isActive: 1, "links.module": 1, "links.refId": 1 });
FileObjectSchema.index({ tenant: 1, checksum: 1 }); // dedup
FileObjectSchema.index({ tenant: 1, mime: 1 });

export const FileObject: Model<IFileObject> =
  models.fileobject || model<IFileObject>("fileobject", FileObjectSchema);
