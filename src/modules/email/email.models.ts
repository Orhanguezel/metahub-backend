import { Schema, model, Document } from "mongoose";

export interface IMailMessage extends Document {
  from: string;
  subject: {
    tr: string;
    en: string;
    de: string;
  };
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

const mailSchema = new Schema<IMailMessage>(
  {
    from: { type: String, required: true },
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

export default model<IMailMessage>("MailMessage", mailSchema);
