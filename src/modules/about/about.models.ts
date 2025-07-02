import { Schema, Model, Types, models, model } from "mongoose";
import type { IAbout, IAboutImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi tanımı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const AboutImageSchema = new Schema<IAboutImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const AboutSchema = new Schema<IAbout>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    summary: localizedStringField(),
    content: localizedStringField(),
    slug: { type: String, required: true, unique: true, lowercase: true },
    images: { type: [AboutImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: Schema.Types.ObjectId,
      ref: "AboutCategory",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AboutSchema.pre("validate", function (next) {
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

const About: Model<IAbout> =
  models.About || model<IAbout>("About", AboutSchema);

export { About, AboutImageSchema, AboutSchema };
