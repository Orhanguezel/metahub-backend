import { Schema, model, Document, Model, models } from "mongoose";

// ✅ FAQ Interface
interface IFAQ extends Document {
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
  category?: string;
  isActive: boolean;
  isPublished: boolean;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

// ✅ FAQ Schema
const faqSchema = new Schema<IFAQ>(
  {
    question: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    answer: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const FAQ: Model<IFAQ> = models.FAQ || model<IFAQ>("FAQ", faqSchema);

export { IFAQ, FAQ };
export default FAQ;
