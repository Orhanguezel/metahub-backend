import mongoose, { Schema, model, Document, Model } from "mongoose";

export interface IDemo extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const demoSchema = new Schema<IDemo>(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

// Model: hem named hem default export
export const Demo: Model<IDemo> =
  mongoose.models.Demo || model<IDemo>("Demo", demoSchema);

export default Demo;



