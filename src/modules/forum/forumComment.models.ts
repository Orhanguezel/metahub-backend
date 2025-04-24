import { Schema, model, Document, Types } from "mongoose";

export interface IForumComment extends Document {
  content: {
    tr: string;
    en: string;
    de: string;
  };
  topic: Types.ObjectId;
  user?: Types.ObjectId;
  parentId?: Types.ObjectId;
  isPublished: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const forumCommentSchema = new Schema<IForumComment>(
  {
    content: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    topic: { type: Schema.Types.ObjectId, ref: "ForumTopic", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    parentId: { type: Schema.Types.ObjectId, ref: "ForumComment" },
    isPublished: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<IForumComment>("ForumComment", forumCommentSchema);
