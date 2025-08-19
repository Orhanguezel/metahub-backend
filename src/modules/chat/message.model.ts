import { Schema, model, models, Model } from "mongoose";
import type { IChatMessage } from "@/modules/chat/types";
import { SUPPORTED_LOCALES } from "@/types/common";

/** Çok dilli language alanı */
const languageFields: Record<string, any> = {};
for (const locale of SUPPORTED_LOCALES) {
  languageFields[locale] = { type: String, required: false };
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "user", default: null },
    tenant: { type: String, required: true, index: true },
    roomId: { type: String, required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    isFromBot: { type: Boolean, default: false },
    isFromAdmin: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    language: languageFields,
  },
  { timestamps: true }
);

// 🔎 Kritik performans index’i: oda içi okuma
ChatMessageSchema.index({ tenant: 1, roomId: 1, createdAt: 1 });

export const ChatMessage: Model<IChatMessage> =
  models.chatmessage || model<IChatMessage>("chatmessage", ChatMessageSchema);
