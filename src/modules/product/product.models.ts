import { Schema, Model, Types, models, model } from "mongoose";

export interface IProduct {
  name: {
    tr: string;
    en: string;
    de: string;
  };
  tenant: string; // Optional tenant field for multi-tenancy
  slug: string;
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  price: number;
  stock: number;
  stockThreshold: number;
  category: Types.ObjectId;
  images: string[];
  tags?: string[];
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Schema
const productSchema = new Schema<IProduct>(
  {
    name: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    tenant: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0 },
    stockThreshold: { type: Number, default: 5 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: [{ type: String, required: true }],
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Slug middleware
productSchema.pre<IProduct>("validate", function (next) {
  if (!this.slug && this.name?.en) {
    this.slug = this.name.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");
  }
  next();
});

// ✅ Guard + Model yapısı
const Product: Model<IProduct> =
  models.product || model<IProduct>("product", productSchema);

// ✅ Export
export { Product };
