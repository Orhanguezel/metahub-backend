import { Schema, model, Types, Document } from "mongoose";

export interface IChatMessage {
  sender: Types.ObjectId | null;
  roomId: string;
  message: string;
  isFromBot?: boolean;
  isFromAdmin?: boolean;
  language: "tr" | "en" | "de";
  isRead?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// `Document` ile birleştirme işlemini sadece model tanımlarken yap
export type ChatMessageDocument = Document & IChatMessage;

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", default: null },
    roomId: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    isFromBot: { type: Boolean, default: false },
    isFromAdmin: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    language: { type: String, enum: ["tr", "en", "de"], default: "de" },
  },
  { timestamps: true }
);


export default model<IChatMessage>("ChatMessage", chatMessageSchema);




