import { Schema, model, Document, Model, models } from "mongoose";

// ✅ Interface
interface IFeedback  {
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

// ✅ Schema
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

// ✅ Guard + Model Type
const Feedback: Model<IFeedback> = models.Feedback || model<IFeedback>("Feedback", feedbackSchema);

export { Feedback, IFeedback };
export default Feedback;
