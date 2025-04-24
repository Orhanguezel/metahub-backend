import { Schema, model, Document } from "mongoose";

export interface IEducation extends Document {
  degree: {
    tr: string;
    en: string;
    de: string;
  };
  institution: {
    tr: string;
    en: string;
    de: string;
  };
  period: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const educationSchema = new Schema<IEducation>(
  {
    degree: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    institution: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    period: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

export default model<IEducation>("Education", educationSchema);
