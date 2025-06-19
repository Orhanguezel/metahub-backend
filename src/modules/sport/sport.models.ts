import mongoose, { Schema, Model, models } from "mongoose";
import { ISport, ISportImage } from "./types/index.js";

const SportImageSchema = new Schema<ISportImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const SportSchema = new Schema<ISport>(
  {
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    tenant: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    summary: {
      tr: { type: String, maxlength: 300 },
      en: { type: String, maxlength: 300 },
      de: { type: String, maxlength: 300 },
    },
    content: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    images: { type: [SportImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SportCategory",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 🔧 Slug Middleware
SportSchema.pre("validate", function (this: ISport, next) {
  const base = this.title?.en || this.title?.de || this.title?.tr || "sport";
  if (!this.slug && base) {
    this.slug = base
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

// ✅ Guarded Model
const Sport: Model<ISport> =
  (models.Sport as Model<ISport>) || mongoose.model<ISport>("Sport", SportSchema);

export { Sport };
