import mongoose, { Schema, Types, Model, models } from "mongoose";

export interface IArticlesCategory  {
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

const ArticlesCategorySchema = new Schema<IArticlesCategory>(
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

ArticlesCategorySchema.pre("validate", function (next) {
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
const ArticlesCategory: Model<IArticlesCategory>=
(models.ArticlesCategory as Model<IArticlesCategory>) || mongoose.model<IArticlesCategory>("ArticlesCategory", ArticlesCategorySchema);

export { ArticlesCategory };

