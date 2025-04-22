import { Schema, model, Document } from "mongoose";

export interface IExperience extends Document {
  position: string;
  company: string;
  period: string;
  description?: string;
  location?: string;
  image?: string;
  language?: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const experienceSchema = new Schema<IExperience>(
  {
    position: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    period: { type: String, required: true, trim: true }, // örn: "2020 - 2022"
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    image: { type: String }, // logo url veya path
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<IExperience>("Experience", experienceSchema);
