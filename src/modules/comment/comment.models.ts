import { Schema, model, Document, Types } from "mongoose";

export interface IComment extends Document {
  name: string;
  email: string;
  comment: string;
  contentType: "blog" | "product" | "service";
  contentId: Types.ObjectId;
  isPublished: boolean;
  isActive: boolean;
  language?: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}


const commentSchema = new Schema<IComment>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    comment: { type: String, required: true, trim: true },
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
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<IComment>("Comment", commentSchema);
