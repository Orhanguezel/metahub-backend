import { Schema, Model, Types, models, model } from "mongoose";
import type { IReferences, IReferencesImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çok dilli string alanı için şema
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

const ReferencesImageSchema = new Schema<IReferencesImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const ReferencesSchema = new Schema<IReferences>(
  {
    title: localizedStringField(),         // Opsiyonel tutulacaksa default "" verildi
    tenant: { type: String, required: true, index: true },
    content: localizedStringField(),
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    images: { type: [ReferencesImageSchema], default: [], required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ReferencesCategory",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Slug otomatik oluşturucu
ReferencesSchema.pre("validate", function (next) {
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

const References: Model<IReferences> =
  models.References || model<IReferences>("References", ReferencesSchema);

export { References, ReferencesImageSchema, ReferencesSchema };
