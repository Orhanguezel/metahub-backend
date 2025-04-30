import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReference extends Document {
  companyName: {
    tr: string;
    en: string;
    de: string;
  };
  slug: string;
  url?: string;
  logos: string[];
  sector: {
    tr: string;
    en: string;
    de: string;
  };
  country?: string;
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  year?: number;
  tags?: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const referenceSchema = new Schema<IReference>(
  {
    companyName: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    slug: { type: String, required: true, unique: true },
    url: { type: String },
    logos: [{ type: String, required: true }],
    sector: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    country: { type: String },
    description: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    year: { type: Number },
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 🔁 Slug üretimi
referenceSchema.pre("validate", function (this: IReference, next) {
  if (!this.slug && this.companyName?.en) {
    this.slug = this.companyName.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

export const Reference: Model<IReference> =
  mongoose.models.Reference || mongoose.model<IReference>("Reference", referenceSchema);
