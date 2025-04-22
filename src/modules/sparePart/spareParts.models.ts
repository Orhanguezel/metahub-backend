import mongoose, { Schema, Document } from "mongoose";

export interface ISparePart extends Document {
  name: string;
  slug: string;
  code?: string;
  description?: string;
  image?: string[];
  category?: string;
  manufacturer?: string;
  specifications?: Record<string, string>; // teknik detaylar
  stock?: number;
  price?: number;
  tags?: string[];
  language?: "tr" | "en" | "de";
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sparePartSchema: Schema = new Schema<ISparePart>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    code: { type: String, unique: true, sparse: true },
    description: { type: String },
    image: [{ type: String }],
    category: { type: String },
    manufacturer: { type: String },
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    stock: { type: Number, default: 0 },
    price: { type: Number },
    tags: [{ type: String }],
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
    isPublished: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// 🔁 Slug otomatik üretimi
sparePartSchema.pre("validate", function (this: ISparePart, next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

const SparePart = mongoose.model<ISparePart>("SparePart", sparePartSchema);
export default SparePart;
