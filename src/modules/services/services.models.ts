import mongoose, { Schema, model, Document, Model } from "mongoose";

export interface IService extends Document {
  title: {
    tr: string;
    en: string;
    de: string;
  };
  shortDescription: {
    tr: string;
    en: string;
    de: string;
  };
  detailedDescription: {
    tr: string;
    en: string;
    de: string;
  };
  price: number;
  durationMinutes: number;
  images: string[];
  category?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  tags?: string[];
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    title: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    shortDescription: {
      tr: { type: String, required: true, maxlength: 300, trim: true },
      en: { type: String, required: true, maxlength: 300, trim: true },
      de: { type: String, required: true, maxlength: 300, trim: true },
    },
    detailedDescription: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
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
      tr: { type: String },
      en: { type: String },
      de: { type: String },
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
  },
  { timestamps: true }
);

const Service: Model<IService> = mongoose.models.Service || model<IService>("Service", serviceSchema);
export default Service;

