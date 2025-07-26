import { Schema, model, Document, Model, models } from "mongoose";

interface IExperience extends Document {
  position: {
    tr: string;
    en: string;
    de: string;
  };
  tenant: string; // Optional tenant field for multi-tenancy
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
    tenant: { type: String, required: true, index: true },
    company: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    period: { type: String, required: true, trim: true },
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

// ✅ Guard + Model Type
const Experience: Model<IExperience> =
  models.experience || model<IExperience>("experience", experienceSchema);

export { Experience, IExperience };
export default Experience;
