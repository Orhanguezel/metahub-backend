import { Schema, model, Document } from "mongoose";

export interface IForumCategory extends Document {
  name: string;
  description?: string;
  language: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const forumCategorySchema = new Schema<IForumCategory>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    language: { type: String, enum: ["tr", "en", "de"], default: "en" },
  },
  { timestamps: true }
);

export default model<IForumCategory>("ForumCategory", forumCategorySchema);
