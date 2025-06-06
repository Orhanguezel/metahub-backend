import mongoose, { Schema, model, Document, Model, models } from "mongoose";

// ✅ Education Interface
interface IEducation extends Document {
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

// ✅ Education Schema
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

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const Education: Model<IEducation> =
  models.Education || model<IEducation>("Education", educationSchema);

export default Education;
export { IEducation };
