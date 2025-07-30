import { Schema, Model, Types, models, model } from "mongoose";
import type { INotification } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çoklu dil alan otomasyonu
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "user", required: false },
    tenant: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    title: localizedStringField(),
    message: localizedStringField(),
    data: { type: Schema.Types.Mixed, default: null }, // future-proof payload!
    isRead: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Notification: Model<INotification> =
  models.notification || model<INotification>("notification", notificationSchema);

export { Notification };