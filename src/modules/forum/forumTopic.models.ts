import { Schema, model, Document, Types } from "mongoose";

export interface IForumTopic extends Document {
  title: string;
  content: string;
  category: Types.ObjectId;
  user?: Types.ObjectId;
  isPinned: boolean;
  isLocked: boolean;
  language: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const forumTopicSchema = new Schema<IForumTopic>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "ForumCategory", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    language: { type: String, enum: ["tr", "en", "de"], default: "en" },
  },
  { timestamps: true }
);

export default model<IForumTopic>("ForumTopic", forumTopicSchema);
