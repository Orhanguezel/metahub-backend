import { Schema, model, Document, Model, models } from "mongoose";

// ✅ Contact Message Interface
interface IContactMessage  {
  name: string;
  email: string;
  label: {
    subject: {
      tr: string;
      en: string;
      de: string;
    };
    message: {
      tr: string;
      en: string;
      de: string;
    };
  };
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Contact Message Schema
const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    label: {
      subject: {
        tr: { type: String, required: true },
        en: { type: String, required: true },
        de: { type: String, required: true },
      },
      message: {
        tr: { type: String, required: true },
        en: { type: String, required: true },
        de: { type: String, required: true },
      },
    },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const ContactMessage: Model<IContactMessage> =
  models.ContactMessage || model<IContactMessage>("ContactMessage", contactMessageSchema);

export { ContactMessage, IContactMessage };
export default ContactMessage;
