import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock: number;
  stockThreshold: number;
  category: Types.ObjectId;
  images: string[];
  tags?: string[];
  language: "tr" | "en" | "de";
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0 },
    stockThreshold: { type: Number, default: 5 },

    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: [{ type: String, required: true }],
    tags: [{ type: String }],
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// 🔁 Slug otomatik üretimi
productSchema.pre("validate", function (this: IProduct, next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

const Product: Model<IProduct> = mongoose.model<IProduct>(
  "Product",
  productSchema
);
export default Product;
