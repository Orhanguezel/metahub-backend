import { Schema, model, Document } from "mongoose";

export interface IFeedback extends Document {
  name: string;
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

const feedbackSchema = new Schema<IFeedback>(
  {
    name: { type: String, required: true, trim: true },
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

export default model<IFeedback>("Feedback", feedbackSchema);
