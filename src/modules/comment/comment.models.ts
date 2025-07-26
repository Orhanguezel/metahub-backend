import { Schema, model, Types, Model, models } from "mongoose";
import {
  ALLOWED_COMMENT_CONTENT_TYPES,
  ALLOWED_COMMENT_TYPES,
} from "@/core/utils/constants";
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
    userId: { type: Schema.Types.ObjectId, ref: "user", required: false },
    name: {
      type: String,
      trim: true,
      required: function () {
        return !this.userId;
      },
    },
    profileImage: {
      type: Schema.Types.Mixed,
      required: false,
    },
    email: {
      type: String,
      trim: true,
      required: function () {
        return !this.userId;
      },
    },
    tenant: { type: String, required: true, index: true },
    label: { type: String, trim: true },
    text: { type: String, trim: true, required: true },
    contentType: {
      type: String,
      enum: ALLOWED_COMMENT_CONTENT_TYPES,
      required: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      required: function () {
        // Testimonial ise gerekmesin
        return this.type !== "testimonial";
      },
      // contentType testimonial ise refPath olmayacak!
      refPath: function () {
        if (this.type === "testimonial") return undefined;
        return "contentType";
      },
    },
    type: {
      type: String,
      enum: ALLOWED_COMMENT_TYPES,
      default: "comment",
    },
    reply: {
      text: localizedStringField(),
      createdAt: { type: String },
    },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, min: 1, max: 5, required: false },
  },
  { timestamps: true }
);

const Comment: Model<IComment> =
  models.comment || model<IComment>("comment", commentSchema);

export { Comment, commentSchema };
