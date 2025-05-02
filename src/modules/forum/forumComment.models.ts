import { Schema, model, Document, Types, models, Model } from "mongoose";

interface IForumComment extends Document {
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

// ✅ Guard + Model Type
const ForumComment: Model<IForumComment> =
  models.ForumComment || model<IForumComment>("ForumComment", forumCommentSchema);

export { IForumComment };
export default ForumComment;
