// models/chatMessage.model.ts
import { Schema, model, Types, Document } from "mongoose";

export interface IChatMessage extends Document {
  sender: Types.ObjectId | null;
  roomId: string;
  message: string;
  isFromBot?: boolean;
  isFromAdmin?: boolean;
  lang?: "tr" | "en" | "de";
  isRead?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", default: null }, // Bot için null olabilir
    roomId: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    isFromBot: { type: Boolean, default: false },
    isFromAdmin: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    lang: { type: String, enum: ["tr", "en", "de"], default: "de" },
  },
  { timestamps: true }
);

export default model<IChatMessage>("ChatMessage", chatMessageSchema);
