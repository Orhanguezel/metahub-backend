import { Schema, model, Document, models, Model } from "mongoose";

interface IForumCategory extends Document {
  name: {
    tr: string;
    en: string;
    de: string;
  };
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const forumCategorySchema = new Schema<IForumCategory>(
  {
    name: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    description: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type
const ForumCategory: Model<IForumCategory> =
  models.ForumCategory || model<IForumCategory>("ForumCategory", forumCategorySchema);

export { IForumCategory };
export default ForumCategory;
