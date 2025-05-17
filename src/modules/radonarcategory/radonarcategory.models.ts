import mongoose, { Schema, Document, Types, Model, models } from "mongoose";

export interface IRadonarCategory  {
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

const RadonarCategorySchema = new Schema<IRadonarCategory>(
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

RadonarCategorySchema.pre("validate", function (next) {
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
const RadonarCategory: Model<IRadonarCategory>=
(models.RadonarCategory as Model<IRadonarCategory>) || mongoose.model<IRadonarCategory>("RadonarCategory", RadonarCategorySchema);

export default RadonarCategory;
export { RadonarCategory };

