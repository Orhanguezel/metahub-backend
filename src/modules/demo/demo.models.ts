import { Schema, model, Document } from "mongoose";

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

export const Demo = model<IDemo>("Demo", demoSchema);
