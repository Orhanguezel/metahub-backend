import { Schema, model, models, Model } from "mongoose";
import type { IChatSession } from "@/modules/chat/types";

const ChatSessionSchema = new Schema<IChatSession>(
  {
    roomId: { type: String, required: true },
    tenant: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "user" },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
  },
  { timestamps: false }
);

// ♻️ Çoklu tenant için doğru unique: (tenant, roomId)
ChatSessionSchema.index({ tenant: 1, roomId: 1 }, { unique: true });

export const ChatSession: Model<IChatSession> =
  models.chatsession || model<IChatSession>("chatsession", ChatSessionSchema);
