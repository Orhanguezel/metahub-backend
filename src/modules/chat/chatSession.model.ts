import { Schema, model, models, Types, Document, Model } from "mongoose";

// 💬 Chat Session Interface
export interface IChatSession  {
  roomId: string;
  user?: Types.ObjectId;
  createdAt: Date;
  closedAt?: Date;
}

const chatSessionSchema = new Schema<IChatSession>({
  roomId: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const ChatSession: Model<IChatSession> =
  models.ChatSession || model<IChatSession>("ChatSession", chatSessionSchema);

export default ChatSession;
