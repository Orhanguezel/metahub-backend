import { Schema, model, Types, Model, models } from "mongoose";
import { ALLOWED_COMMENT_CONTENT_TYPES } from "@/core/utils/constants";
import { SUPPORTED_LOCALES } from "@/types/common";
import type { IComment } from "./types";

// Çok dilli alanlar için field
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const commentSchema = new Schema<IComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    name: {
      type: String,
      trim: true,
      required: function () { return !this.userId; },
    },
    tenant: { type: String, required: true, index: true },
    email: {
      type: String,
      trim: true,
      required: function () { return !this.userId; },
    },
    label: { type: String, trim: true },
    text:  { type: String, trim: true, required: true },
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
      text: localizedStringField(),
      createdAt: { type: String },
    },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Comment: Model<IComment> =
  models.Comment || model<IComment>("Comment", commentSchema);

export { Comment, commentSchema };
