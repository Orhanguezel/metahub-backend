import { Schema, model, models, Types, Document, Model } from "mongoose";

export interface IChatSession extends Document {
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

const ChatSession: Model<IChatSession> = models.ChatSession || model<IChatSession>("ChatSession", chatSessionSchema);

export default ChatSession;
