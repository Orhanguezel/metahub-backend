import { Schema, Model, Types, models, model } from "mongoose";
import type { ILibrary, ILibraryImage, ILibraryFile } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çoklu dil alan otomasyonu
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const LibraryImageSchema = new Schema<ILibraryImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const LibraryFileSchema = new Schema<ILibraryFile>(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number },
    type: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const LibrarySchema = new Schema<ILibrary>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    summary: { type: localizedStringField(), default: undefined }, // opsiyonel
    content: localizedStringField(),
    images: { type: [LibraryImageSchema], default: undefined }, // opsiyonel
    files: { type: [LibraryFileSchema], default: undefined }, // opsiyonel
    tags: { type: [String], default: undefined }, // opsiyonel
    author: { type: String },
    category: {
      type: Schema.Types.ObjectId,
      ref: "librarycategory",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: Schema.Types.ObjectId, ref: "comment" }],
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LibrarySchema.pre("validate", function (next) {
  // Slug yoksa İngilizce başlıktan otomatik üret
  if (!this.slug && this.title?.en) {
    this.slug = this.title.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const Library: Model<ILibrary> =
  models.library || model<ILibrary>("library", LibrarySchema);

export { Library, LibraryImageSchema, LibraryFileSchema, LibrarySchema };
