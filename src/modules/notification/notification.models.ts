import { Schema, model, Document, Types, Model, models } from "mongoose";

// ✅ Interface
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

// ✅ Schema
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

// ✅ Guard + Model Type (standart yapı)
const Notification: Model<INotification> =
  models.Notification || model<INotification>("Notification", notificationSchema);

// ✅ Export
export default Notification;
export { Notification }; // named export (standart)
