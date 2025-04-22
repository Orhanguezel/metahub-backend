import { Schema, model, Document } from "mongoose";

export interface ISport extends Document {
  name: string;
  description?: string;
  category?: string;
  images: string[];
  language: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const sportSchema = new Schema<ISport>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    images: [{ type: String }],
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<ISport>("Sport", sportSchema);
