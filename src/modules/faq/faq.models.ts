import { Schema, model, Document } from "mongoose";

export interface IFAQ extends Document {
  question: string;
  answer: string;
  category?: string;
  isActive: boolean;
  isPublished: boolean;
  language?: "tr" | "en" | "de";
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFAQ>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",

    },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export default model<IFAQ>("FAQ", faqSchema);
