import { Schema, Model, Types, models, model } from "mongoose";
import type { IArticles, IArticlesImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi tanımı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const ArticlesImageSchema = new Schema<IArticlesImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const ArticlesSchema = new Schema<IArticles>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    summary: localizedStringField(),
    content: localizedStringField(),
    slug: { type: String, required: true, unique: true, lowercase: true },
    images: { type: [ArticlesImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ArticlesCategory",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ArticlesSchema.pre("validate", function (next) {
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

const Articles: Model<IArticles> =
  models.Articles || model<IArticles>("Articles", ArticlesSchema);

export { Articles, ArticlesImageSchema, ArticlesSchema };
