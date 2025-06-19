import { Schema, Model, Types, models, model } from "mongoose";
import type { IArticles, IArticlesImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

const translatedFieldSchema = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<string, any>);

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
    title: translatedFieldSchema,
    tenant: { type: String, required: true, index: true },
    summary: translatedFieldSchema,
    content: translatedFieldSchema,
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
