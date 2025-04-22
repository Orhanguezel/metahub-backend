// src/models/guestbook.models.ts

import { Schema, model, Document, Types } from "mongoose";

export interface IGuestbookEntry extends Document {
  name: string;
  email?: string;
  message: string;
  parentId?: Types.ObjectId; // alt yorumlar için
  isPublished: boolean;
  isActive: boolean;
  language: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const guestbookSchema = new Schema<IGuestbookEntry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    message: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Guestbook" },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<IGuestbookEntry>("Guestbook", guestbookSchema);
