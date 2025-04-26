import { Schema, model, Document, Types } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  label: {
    tr: string;
    en: string;
    de: string;
  };
  parentCategory?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    image: { type: String, default: "defaults/category.png" },
    isActive: { type: Boolean, default: true },
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    parentCategory: { type: Schema.Types.ObjectId, ref: "Category" }, 
  },
  { timestamps: true }
);

categorySchema.pre("validate", function (this: ICategory, next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

const Category = model<ICategory>("Category", categorySchema);

export { Category };
