import { Schema, model, Document } from "mongoose";

export interface IExperience extends Document {
  position: {
    tr: string;
    en: string;
    de: string;
  };
  company: {
    tr: string;
    en: string;
    de: string;
  };
  period: string;
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  location?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const experienceSchema = new Schema<IExperience>(
  {
    position: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    company: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    period: { type: String, required: true, trim: true }, // örn: "2020 - 2022"
    description: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    location: { type: String, trim: true },
    image: { type: String },
  },
  { timestamps: true }
);

export default model<IExperience>("Experience", experienceSchema);
