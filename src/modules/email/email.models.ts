import mongoose, { Schema, model, Model, models } from "mongoose";

// ✅ EmailMessage Interface
export interface IEmailMessage {
  from: string;
  subject: {
    tr: string;
    en: string;
    de: string;
  };
  tenant: string; // Optional tenant field for multi-tenancy
  body: {
    tr: string;
    en: string;
    de: string;
  };
  date: Date;
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ EmailMessage Schema
const EmailSchema = new Schema<IEmailMessage>(
  {
    from: { type: String, required: true },
    tenant: { type: String, required: true, index: true },
    subject: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    body: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    date: { type: Date, required: true },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const EmailMessage: Model<IEmailMessage> =
  models.EmailMessage || model<IEmailMessage>("EmailMessage", EmailSchema);

export { EmailMessage };
