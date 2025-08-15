import { Schema, Model, models, model, Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";

/* ---- Types ---- */
export type TranslatedLabel = { [key in SupportedLocale]?: string };

export interface INewsImage {
  _id?: Types.ObjectId;         // V2: alt dokümanda id açık
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface INews {
  title: TranslatedLabel;
  tenant: string;
  slug: string;
  summary: TranslatedLabel;
  content: TranslatedLabel;
  images: INewsImage[];
  tags: string[];
  author?: string;
  category: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/* ---- Helpers ---- */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) fields[locale] = { type: String, trim: true };
  return fields;
};

/* ---- Schemas ---- */
const NewsImageSchema = new Schema<INewsImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: true }                          // V2: _id açık
);

const NewsSchema = new Schema<INews>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true, trim: true },
    summary: localizedStringField(),
    content: localizedStringField(),
    slug: { type: String, required: true, lowercase: true, trim: true },
    images: { type: [NewsImageSchema], default: [] },
    tags: { type: [String], default: [], set: (arr: string[]) => [...new Set((arr || []).map(s => s.trim()).filter(Boolean))] },
    author: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "newscategory", required: true },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    comments: { type: [Schema.Types.ObjectId], ref: "comment", default: [] },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true, minimize: false }
);

/* ---- Indexes ---- */
// tenant + slug benzersiz
NewsSchema.index({ tenant: 1, slug: 1 }, { unique: true });
NewsSchema.index({ tenant: 1, createdAt: -1 });

/* ---- Hooks ---- */
NewsSchema.pre("validate", function (next) {
  if (!Array.isArray(this.images)) this.images = [];
  if (!Array.isArray(this.tags)) this.tags = [];
  if (!Array.isArray(this.comments)) this.comments = [];

  // slug yoksa başlıktan üret
  if (!this.slug) {
    const first =
      this.title?.tr || this.title?.en || Object.values(this.title || {})[0] || "news";
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
NewsSchema.pre("save", function (next) {
  if (this.isModified("isPublished")) {
    if (this.isPublished && !this.publishedAt) this.publishedAt = new Date();
    if (!this.isPublished) this.publishedAt = undefined;
  }
  next();
});

export const News: Model<INews> = models.news || model<INews>("news", NewsSchema);
