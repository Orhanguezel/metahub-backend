import { Schema, model, Model, models } from "mongoose";
import type { IFAQ } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

// ✅ Schema
const faqSchema = new Schema<IFAQ>(
  {
    question: localizedStringField(),
    answer: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
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

// ✅ Model tanımı
const FAQ: Model<IFAQ> = models.faq || model<IFAQ>("faq", faqSchema);
export { FAQ };
