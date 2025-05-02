// ✅ Guard + Model Type

import mongoose, { Schema, model, Document, Types, Model } from "mongoose";

export interface IArticle extends Document {
  title: string;
  slug: string;
  summary: string;
  content: string;
  images: string[];
  category?: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date;
  author?: string;
  comments: Types.ObjectId[];
  label: {
    tr: string;
    en: string;
    de: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const articleSchema: Schema<IArticle> = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, required: true, maxlength: 300 },
    content: { type: String, required: true },
    images: [{ type: String, required: true }],
    category: { type: String },
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    author: { type: String },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// 🔁 Slug generator
articleSchema.pre("validate", function (this: IArticle, next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

// ✅ Guard + Model Type
const Article: Model<IArticle> =
  mongoose.models.Article || model<IArticle>("Article", articleSchema);

export default Article;
export { Article };
