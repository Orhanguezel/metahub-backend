import mongoose, { Schema, Document, Types, Model, models } from "mongoose";

export interface IEnsotekCategory extends Document {
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

const EnsotekCategorySchema = new Schema<IEnsotekCategory>(
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

EnsotekCategorySchema.pre("validate", function (next) {
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
const EnsotekCategory: Model<IEnsotekCategory>=
(models.EnsotekCategory as Model<IEnsotekCategory>) || mongoose.model<IEnsotekCategory>("EnsotekCategory", EnsotekCategorySchema);

export default EnsotekCategory;
export { EnsotekCategory };

