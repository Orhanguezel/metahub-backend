import { Schema, model, Document, Types, models, Model } from "mongoose";

interface IForumTopic extends Document {
  title: {
    tr: string;
    en: string;
    de: string;
  };
  content: {
    tr: string;
    en: string;
    de: string;
  };
  category: Types.ObjectId;
  user?: Types.ObjectId;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const forumTopicSchema = new Schema<IForumTopic>(
  {
    title: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    content: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ForumCategory",
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type
const ForumTopic: Model<IForumTopic> =
  models.ForumTopic || model<IForumTopic>("ForumTopic", forumTopicSchema);

export { IForumTopic };
export default ForumTopic;
