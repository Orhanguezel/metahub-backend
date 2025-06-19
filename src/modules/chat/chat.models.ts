import { Schema, model, models, Types, Model } from "mongoose";

/* --------------------------------------
   Chat Message
--------------------------------------- */
export interface IChatMessage {
  sender: Types.ObjectId | null;
  tenant: string; // Optional tenant field for multi-tenancy
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

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", default: null },
    tenant: { type: String, required: true, index: true },
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

export const ChatMessage: Model<IChatMessage> =
  models.ChatMessage || model<IChatMessage>("ChatMessage", ChatMessageSchema);

/* --------------------------------------
   Chat Session
--------------------------------------- */
export interface IChatSession {
  roomId: string;
  tenant: string; // Optional tenant field for multi-tenancy
  user?: Types.ObjectId;
  createdAt: Date;
  closedAt?: Date;
}

const ChatSessionSchema = new Schema<IChatSession>({
  roomId: { type: String, required: true, unique: true },
  tenant: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

export const ChatSession: Model<IChatSession> =
  models.ChatSession || model<IChatSession>("ChatSession", ChatSessionSchema);
