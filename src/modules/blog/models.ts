import { Schema, Model, Types, models, model } from "mongoose";
import type { IBlog, IBlogImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi tanımı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
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

const BlogSchema = new Schema<IBlog>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    summary: localizedStringField(),
    content: localizedStringField(),
    slug: { type: String, required: true, unique: true, lowercase: true },
    images: { type: [BlogImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: Schema.Types.ObjectId,
      ref: "BlogCategory",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BlogSchema.pre("validate", function (next) {
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

const Blog: Model<IBlog> = models.Blog || model<IBlog>("Blog", BlogSchema);

export { Blog, BlogImageSchema, BlogSchema };
