import { Schema, model, Document, Model } from "mongoose";

export interface IService extends Document {
  title: string;
  shortDescription: string;
  detailedDescription: string;
  price: number;
  images: string[];
  category?: string;
  tags?: string[];
  durationMinutes: number;
  isActive: boolean;
  isPublished: boolean;
  language?: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      required: true,
      maxlength: 300,
      trim: true,
    },
    detailedDescription: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 1,
    },
    images: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      default: "other",
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

const Service: Model<IService> = model<IService>("Service", serviceSchema);
export default Service;
