import { Schema, model, Document } from "mongoose";

export interface IEducation extends Document {
  degree: string;
  institution: string;
  period: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const educationSchema = new Schema<IEducation>(
  {
    degree: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    period: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

export default model<IEducation>("Education", educationSchema);
