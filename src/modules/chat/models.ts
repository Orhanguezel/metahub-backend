import { Schema, model, models, Types, Model } from "mongoose";
import type { IChatMessage, IChatSession } from "@/modules/chat/types";
import { SUPPORTED_LOCALES } from "@/types/common";

/** Çok dilli language alanı */
const languageFields: Record<string, any> = {};
for (const locale of SUPPORTED_LOCALES) {
  languageFields[locale] = { type: String, required: false };
}

/** ChatMessage Model */
const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", default: null },
    tenant: { type: String, required: true, index: true },
    roomId: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    isFromBot: { type: Boolean, default: false },
    isFromAdmin: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    language: languageFields,
  },
  { timestamps: true }
);

export const ChatMessage: Model<IChatMessage> =
  models.ChatMessage || model<IChatMessage>("ChatMessage", ChatMessageSchema);

/** ChatSession Model */
const ChatSessionSchema = new Schema<IChatSession>(
  {
    roomId: { type: String, required: true, unique: true },
    tenant: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
  },
  { timestamps: false }
);

export const ChatSession: Model<IChatSession> =
  models.ChatSession || model<IChatSession>("ChatSession", ChatSessionSchema);
