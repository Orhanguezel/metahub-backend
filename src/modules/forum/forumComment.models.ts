import { Schema, model, Document, Types } from "mongoose";

export interface IForumComment extends Document {
  content: string;
  topic: Types.ObjectId;
  user?: Types.ObjectId;
  parentId?: Types.ObjectId;
  isPublished: boolean;
  isActive: boolean;
  language: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const forumCommentSchema = new Schema<IForumComment>(
  {
    content: { type: String, required: true },
    topic: { type: Schema.Types.ObjectId, ref: "ForumTopic", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    parentId: { type: Schema.Types.ObjectId, ref: "ForumComment" },
    isPublished: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    language: { type: String, enum: ["tr", "en", "de"], default: "en" },
  },
  { timestamps: true }
);

export default model<IForumComment>("ForumComment", forumCommentSchema);
