import mongoose, { Schema, model, models, Model } from "mongoose";
import { ITask } from "./types";

const TaskSchema = new Schema<ITask>(
  {
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    tenant: { type: String, required: true, index: true },
    description: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    apartment: {
      type: Schema.Types.ObjectId,
      ref: "apartment",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "paused", "completed", "cancelled"],
      default: "pending",
    },
    period: {
      type: String,
      enum: ["one-time", "daily", "weekly", "bi-weekly", "monthly"],
      default: "one-time",
    },
    repeat: { type: Boolean, default: false },
    dueDate: { type: Date },
    completedAt: { type: Date },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },
    notes: { type: String },
    files: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Task: Model<ITask> = models.task || model<ITask>("task", TaskSchema);
export { Task };
