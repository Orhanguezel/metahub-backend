import { Schema, model, Model, models } from "mongoose";
import type { IEmailMessage } from "./types";

// ✅ EmailMessage Schema
const EmailSchema = new Schema<IEmailMessage>(
  {
    from: { type: String, required: true },
    tenant: { type: String, required: true, index: true },
    subject: { type: String, required: true }, // Tek dil!
    body: { type: String, required: true }, // Tek dil!
    date: { type: Date, required: true },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const EmailMessage: Model<IEmailMessage> =
  models.emailmessage || model<IEmailMessage>("emailmessage", EmailSchema);

export { EmailMessage };
