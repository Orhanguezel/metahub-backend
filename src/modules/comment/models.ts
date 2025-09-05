import { Schema, model, Model, models } from "mongoose";
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
      enum: ALLOWED_COMMENT_CONTENT_TYPES, // 'global' dahil olmalı
      required: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      required: function () {
        // testimonial ise gerekmesin
        return this.type !== "testimonial";
      },
      // testimonial ise refPath olmayacak
      refPath: function (this: any) {
        if (this.type === "testimonial") return undefined;
        return "contentType";
      },
    },

    type: {
      type: String,
      enum: ALLOWED_COMMENT_TYPES, // ["comment","testimonial","review","question","answer","rating"]
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

/* Performans indexleri (public listeler) */
commentSchema.index(
  { tenant: 1, type: 1, isPublished: 1, isActive: 1, createdAt: -1 },
  { name: "idx_comment_public_lists" }
);

const Comment: Model<IComment> =
  models.comment || model<IComment>("comment", commentSchema);

export { Comment, commentSchema };
