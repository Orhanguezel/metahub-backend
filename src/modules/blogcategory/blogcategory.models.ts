import mongoose, { Schema, Document, Types, Model, models } from "mongoose";

export interface IBlogCategory  {
  name: {
    tr: string;
    en: string;
    de: string;
  };
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    name: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
      de: { type: String, required: true, trim: true },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

BlogCategorySchema.pre("validate", function (next) {
  if (!this.slug && this.name?.en) {
    this.slug = this.name.en
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});


// ✅ Guard + Model Type
const BlogCategory: Model<IBlogCategory>=
(models.BlogCategory as Model<IBlogCategory>) || mongoose.model<IBlogCategory>("BlogCategory", BlogCategorySchema);

export default BlogCategory;
export { BlogCategory };

