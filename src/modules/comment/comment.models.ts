import { Schema, model, Types, Document, Model, models } from "mongoose";

interface IComment extends Document {
  name: string;
  email: string;
  label: { tr: string; en: string; de: string };
  contentType: "blog" | "product" | "service";
  contentId: Types.ObjectId;
  isPublished: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    contentType: {
      type: String,
      enum: ["blog", "product", "service"],
      required: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "contentType",
    },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const Comment: Model<IComment> = models.Comment || model<IComment>("Comment", commentSchema);

export { Comment, IComment };
export default Comment;
