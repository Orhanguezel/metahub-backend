// models/contact.model.ts

import { Schema, model, Model, models } from "mongoose";
import type { IContactMessage } from "@/modules/contact/types";

// ✅ Contact Message Schema
const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true },
    tenant: { type: String, required: true, index: true },
    email: { type: String, required: true },
    subject: { type: String, required: true }, // Düz string
    message: { type: String, required: true }, // Düz string
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Model
const ContactMessage: Model<IContactMessage> =
  models.contactmessage ||
  model<IContactMessage>("contactmessage", ContactMessageSchema);

export { ContactMessage };
