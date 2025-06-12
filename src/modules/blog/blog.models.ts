// /modules/blog/blog.model.ts

import mongoose, { Schema, Types, Model, models } from "mongoose";
import { SUPPORTED_LOCALES } from "@/types/common";
import type { IBlog, IBlogImage } from "./types/index";

// 🔸 Dinamik çok dilli alan şeması
const multilingualField = (maxLength?: number) => {
  const field: any = {};
  for (const lang of SUPPORTED_LOCALES) {
    field[lang] = maxLength
      ? { type: String, trim: true, maxlength: maxLength }
      : { type: String, trim: true };
  }
  return field;
};

const BlogImageSchema = new Schema<IBlogImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const BlogSchema: Schema = new Schema<IBlog>(
  {
    title: multilingualField(),
    slug: { type: String, required: true, unique: true, lowercase: true },
    summary: multilingualField(300),
    content: multilingualField(),
    images: { type: [BlogImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "BlogCategory" },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    isActive: { type: Boolean, default: true }, // soft delete
  },
  { timestamps: true }
);

// ✅ Slug oluşturucu middleware
BlogSchema.pre("validate", function (next) {
  const langs = SUPPORTED_LOCALES;
  let baseTitle = "";
  for (const l of langs) {
    if ((this.title && this.title[l]) && this.title[l].trim().length > 0) {
      baseTitle = this.title[l];
      break;
    }
  }
  if (!this.slug && baseTitle) {
    this.slug = baseTitle
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});


BlogSchema.post("save", function (doc) {
  if (process.env.NODE_ENV !== "test") {
  }
});

// Guard + Model Type
const Blog: Model<IBlog> =
  (models.Blog as Model<IBlog>) || mongoose.model<IBlog>("Blog", BlogSchema);

export { Blog };
