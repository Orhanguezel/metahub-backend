import mongoose, { Schema, Document, Model, Types } from "mongoose";

// 📦 Product interface
interface IProduct extends Document {
  name: {
    tr: string;
    en: string;
    de: string;
  };
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

// 🧩 Schema tanımı
const productSchema = new Schema<IProduct>(
  {
    name: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
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

// 🧠 Slug üretimi
productSchema.pre("validate", function (next) {
  if (!this.slug && this.name?.en) {
    this.slug = this.name.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");
  }
  next();
});

// 📤 Model export
const Product: Model<IProduct> = mongoose.model<IProduct>("Product", productSchema);
export { Product, IProduct };
