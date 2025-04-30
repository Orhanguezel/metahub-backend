import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IGuestbookEntry extends Document {
  name: string;
  email?: string;
  message: {
    tr?: string;
    en?: string;
    de?: string;
  };
  parentId?: Types.ObjectId;
  isPublished: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const guestbookSchema = new Schema<IGuestbookEntry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    message: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    parentId: { type: Schema.Types.ObjectId, ref: "Guestbook" },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Guestbook: mongoose.Model<IGuestbookEntry> = mongoose.models.Guestbook || model<IGuestbookEntry>("Guestbook", guestbookSchema);
export default Guestbook;
export { Guestbook };


