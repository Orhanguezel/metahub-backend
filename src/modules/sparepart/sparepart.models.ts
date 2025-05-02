import { Schema, Document, Model, models, model } from "mongoose";

export interface ISparePart extends Document {
  label: {
    tr: string;
    en: string;
    de: string;
  };
  slug: string;
  code?: string;
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  image?: string[];
  category?: string;
  manufacturer?: string;
  specifications?: Record<string, string>;
  stock?: number;
  price?: number;
  tags?: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sparePartSchema = new Schema<ISparePart>(
  {
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    slug: { type: String, required: true, unique: true },
    code: { type: String, unique: true, sparse: true },
    description: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
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
    isPublished: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// 🔁 Slug generator middleware
sparePartSchema.pre("validate", function (this: ISparePart, next) {
  if (!this.slug && this.label?.en) {
    this.slug = this.label.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

// ✅ Guard + Model Type (standart)
const SparePart: Model<ISparePart> =
  models.SparePart || model<ISparePart>("SparePart", sparePartSchema);

export default SparePart;
export { SparePart };
