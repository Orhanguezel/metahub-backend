import { Schema, model, Model, models } from "mongoose";

// ✅ Interface
export interface IFeedback {
  name: string;
  tenant: string; // Optional tenant field for multi-tenancy
  email: string;
  message: {
    tr: string;
    en: string;
    de: string;
  };
  rating?: number;
  isPublished: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Schema
const feedbackSchema = new Schema<IFeedback>(
  {
    name: { type: String, required: true, trim: true },
    tenant: { type: String, required: true, index: true },
    email: { type: String, required: true, trim: true },
    message: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    rating: { type: Number, min: 1, max: 5 },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type
const Feedback: Model<IFeedback> =
  models.feedback || model<IFeedback>("feedback", feedbackSchema);

export { Feedback };
