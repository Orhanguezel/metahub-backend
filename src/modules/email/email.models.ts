import { Schema, model, Document } from "mongoose";

export interface IMailMessage extends Document {
  from: string;
  subject: string;
  body: string;
  date: Date;
  isRead: boolean;
  isArchived: boolean;
  language?: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const mailSchema = new Schema<IMailMessage>(
  {
    from: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    date: { type: Date, required: true },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<IMailMessage>("MailMessage", mailSchema);
