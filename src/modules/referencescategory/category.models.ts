import mongoose, { Schema, Model, models, model, Document } from "mongoose";

// Çok dilli kategori tipi
export interface IReferenceCategory extends Document {
  name: {
    tr: string;
    en: string;
    de: string;
  };
  tenant: string; // Optional tenant field for multi-tenancy
  slug: string;
  description: {
    tr: string;
    en: string;
    de: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReferenceCategorySchema = new Schema<IReferenceCategory>(
  {
    name: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    tenant: { type: String, required: true, index: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      tr: { type: String, default: "", trim: true },
      en: { type: String, default: "", trim: true },
      de: { type: String, default: "", trim: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Slug otomasyonu (herhangi bir dil varsa çalışır)
ReferenceCategorySchema.pre("validate", function (next) {
  const doc = this as IReferenceCategory;
  // Varsayılan dil sırası: en > tr > de
  const base =
    doc.name?.en?.toLowerCase() ||
    doc.name?.tr?.toLowerCase() ||
    doc.name?.de?.toLowerCase() ||
    "category";
  if (!doc.slug && base) {
    doc.slug = base
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const ReferenceCategory: Model<IReferenceCategory> =
  models.ReferenceCategory ||
  model<IReferenceCategory>("ReferenceCategory", ReferenceCategorySchema);

export { ReferenceCategory };
