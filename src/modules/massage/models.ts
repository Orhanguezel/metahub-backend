import { Schema, Model, Types, models, model } from "mongoose";
import type { IMassage, IMassageImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi tanımı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const MassageImageSchema = new Schema<IMassageImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const MassageSchema = new Schema<IMassage>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    summary: localizedStringField(),
    content: localizedStringField(),
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    images: { type: [MassageImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    durationMinutes: { type: Number, min: 5, max: 480 },
    price: { type: Number, min: 0 },
    category: {
      type: Schema.Types.ObjectId,
      ref: "massagecategory",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: Schema.Types.ObjectId, ref: "comment" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MassageSchema.pre("validate", function (next) {
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

const Massage: Model<IMassage> =
  models.massage || model<IMassage>("massage", MassageSchema);

export { Massage, MassageImageSchema, MassageSchema };
