import { Schema, model, Document } from "mongoose";

export interface IFeedback extends Document {
  name: string;
  email: string;
  message: string;
  rating?: number;
  isPublished: boolean;
  isActive: boolean;
  language?: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<IFeedback>("Feedback", feedbackSchema);
