import { Schema, Model, models, model } from "mongoose";
import type { ILibrary, ILibraryImage, ILibraryFile } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* ---- Helpers ---- */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) fields[locale] = { type: String, trim: true };
  return fields;
};

const LibraryImageSchema = new Schema<ILibraryImage>(
  {
    url:       { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp:      { type: String, trim: true },
    publicId:  { type: String, trim: true },
  } // _id varsayılan: true
);

const LibraryFileSchema = new Schema<ILibraryFile>(
  {
    url:       { type: String, required: true, trim: true },
    name:      { type: String, required: true, trim: true },
    size:      { type: Number },
    type:      { type: String, trim: true },
    publicId:  { type: String, trim: true },
  },
  { _id: false }
);

const LibrarySchema = new Schema<ILibrary>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    slug: { type: String, required: true, lowercase: true }, // global unique kaldırıldı
    summary: { type: localizedStringField(), default: undefined },
    content: localizedStringField(),
    images: { type: [LibraryImageSchema], default: undefined },
    files: { type: [LibraryFileSchema], default: undefined },
    tags: { type: [String], default: undefined },
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

/* ---- Indexes ---- */
// business key: tenant + slug benzersiz
LibrarySchema.index({ tenant: 1, slug: 1 }, { unique: true });
LibrarySchema.index({ tenant: 1, createdAt: -1 });

/* ---- Hooks ---- */
LibrarySchema.pre("validate", function (next) {
  if (!Array.isArray(this.images)) this.images = [];
  if (!Array.isArray(this.tags)) this.tags = [];
  if (!Array.isArray(this.comments)) this.comments = [];

  // slug yoksa başlıktan üret
  if (!this.slug) {
    const first =
      this.title?.tr || this.title?.en || Object.values(this.title || {})[0] || "library";
    this.slug = String(first)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

// publish değişimini yönet
LibrarySchema.pre("save", function (next) {
  if (this.isModified("isPublished")) {
    if (this.isPublished && !this.publishedAt) this.publishedAt = new Date();
    if (!this.isPublished) this.publishedAt = undefined;
  }
  next();
});

const Library: Model<ILibrary> =
  models.library || model<ILibrary>("library", LibrarySchema);

export { Library, LibraryImageSchema, LibraryFileSchema, LibrarySchema };
