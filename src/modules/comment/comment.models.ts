import { Schema, model, Types, Model, models } from "mongoose";
import {
  ALLOWED_COMMENT_CONTENT_TYPES,
  CommentContentType,
} from "@/core/utils/constants";

interface IComment  {
  userId?: Types.ObjectId;
  name?: string;
  tenant?: string; // Optional tenant field for multi-tenancy
  email?: string;
  label: { tr: string; en: string; de: string };
  contentType: CommentContentType;
  contentId: Types.ObjectId;
  reply?: {
    text: {
      tr: string;
      en: string;
      de: string;
    };
    createdAt: Date;
  };

  isPublished: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },

    name: {
      type: String,
      trim: true,
      required: function () {
        return !this.userId;
      },
    },
    tenant: {
      type: String,
      required: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      required: function () {
        return !this.userId;
      },
    },

    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },

    contentType: {
      type: String,
      enum: ALLOWED_COMMENT_CONTENT_TYPES,
      required: true,
    },

    contentId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "contentType",
    },
    reply: {
      text: {
        tr: { type: String, default: "" },
        en: { type: String, default: "" },
        de: { type: String, default: "" },
      },
      createdAt: { type: Date },
    },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type
const Comment: Model<IComment> =
  models.Comment || model<IComment>("Comment", commentSchema);

export { Comment };
