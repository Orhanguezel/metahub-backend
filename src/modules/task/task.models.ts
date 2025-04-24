// src/models/task.models.ts
import { Schema, model, Document, Types } from "mongoose";

export interface ITask extends Document {
  description: {
    tr: string;
    en: string;
    de: string;
  };
  assignedTo: Types.ObjectId;
  apartment: Types.ObjectId;
  status: "pending" | "in-progress" | "completed";
  period: "daily" | "weekly" | "bi-weekly";
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    description: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    apartment: {
      type: Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "bi-weekly"],
      required: true,
    },
  },
  { timestamps: true }
);

export default model<ITask>("Task", taskSchema);
