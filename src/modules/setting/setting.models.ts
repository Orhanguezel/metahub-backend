import { Schema, model, Document } from "mongoose";

export interface ISetting extends Document {
  key: string;
  value: {
    tr: string;
    en: string;
    de: string;
  };
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    description: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default model<ISetting>("Setting", settingSchema);
