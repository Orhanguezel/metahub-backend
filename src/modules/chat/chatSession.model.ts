// models/chatSession.model.ts
import { Schema, model, Types, Document } from "mongoose";

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

export default model<IChatSession>("ChatSession", chatSessionSchema);
