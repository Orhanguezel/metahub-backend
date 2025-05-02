// src/modules/demo/demo.models.ts
import mongoose, { Schema, model, Document, Model, models } from "mongoose";

// ✅ Demo interface
interface IDemo extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Schema definition
const demoSchema = new Schema<IDemo>(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const Demo: Model<IDemo> = models.Demo || model<IDemo>("Demo", demoSchema);

export default Demo;
export type { IDemo };
