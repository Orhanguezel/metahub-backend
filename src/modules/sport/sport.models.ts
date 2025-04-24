import { Schema, model, Document } from "mongoose";

export interface ISport extends Document {
  label: {
    tr: string;
    en: string;
    de: string;
  };
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  category?: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const sportSchema = new Schema<ISport>(
  {
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    description: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    category: { type: String, trim: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

export default model<ISport>("Sport", sportSchema);
