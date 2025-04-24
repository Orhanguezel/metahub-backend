import { Schema, model, Document, Types } from "mongoose";

export interface INotification extends Document {
  user?: Types.ObjectId;
  title: {
    tr?: string;
    en?: string;
    de?: string;
  };
  message: {
    tr?: string;
    en?: string;
    de?: string;
  };
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: false },
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    message: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    isRead: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<INotification>("Notification", notificationSchema);
