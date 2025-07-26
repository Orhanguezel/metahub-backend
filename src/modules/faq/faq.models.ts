import { Schema, model, Model, models } from "mongoose";

// ✅ Interface
export interface IFAQ {
  question: {
    tr: string;
    en: string;
    de: string;
  };
  answer: {
    tr: string;
    en: string;
    de: string;
  };
  tenant?: string; // Optional tenant field for multi-tenancy
  category?: string;
  isActive: boolean;
  isPublished: boolean;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Schema
const faqSchema = new Schema<IFAQ>(
  {
    question: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    tenant: { type: String, required: true, index: true },
    answer: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    embedding: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr: number[]) => arr.every((v) => typeof v === "number"),
        message: "Embedding must be an array of numbers.",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ✅ Model tanımı (guard'lı)
const FAQ: Model<IFAQ> = models.faq || model<IFAQ>("faq", faqSchema);

// ✅ Export
export { FAQ };
