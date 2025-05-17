import { Schema, model, models, Types, Document, Model } from "mongoose";

// 🗨️ Chat Message Interface
export interface IChatMessage  {
  sender: Types.ObjectId | null;
  roomId: string;
  message: string;
  isFromBot?: boolean;
  isFromAdmin?: boolean;
  isRead?: boolean;
  label: {
    tr: string;
    en: string;
    de: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", default: null },
    roomId: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    isFromBot: { type: Boolean, default: false },
    isFromAdmin: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const ChatMessage: Model<IChatMessage> =
  models.ChatMessage || model<IChatMessage>("ChatMessage", chatMessageSchema);

export default ChatMessage;
