import { Schema, model, Document } from "mongoose";

export interface IFAQ extends Document {
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

export default model<IFAQ>("FAQ", faqSchema);
