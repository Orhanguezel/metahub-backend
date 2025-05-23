import { Schema, Model, Types, models, model } from "mongoose";

export interface IEnsotekProdImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IEnsotekProd  {
  name: {
    tr?: string;
    en?: string;
    de?: string;
  };
  slug: string;
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  price?: number;
  stock?: number;
  stockThreshold?: number;
  category: Types.ObjectId;
  comments?: Types.ObjectId[];
  likes?: number;
  images: IEnsotekProdImage[];
  tags?: string[];
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EnsotekProdImageSchema = new Schema<IEnsotekProdImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const EnsotekProdSchema = new Schema<IEnsotekProd>(
  {
    name:  {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    price: { type: Number, required: false, min: 0 },
    stock: { type: Number, default: 0 },
    stockThreshold: { type: Number, default: 5 },
    category: { 
      type: Schema.Types.ObjectId, 
      ref: "EnsotekCategory", 
      required: true },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    likes: { type: Number, default: 0 },
    images: { type: [EnsotekProdImageSchema], default: [] },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Slug oluşturucu
EnsotekProdSchema.pre<IEnsotekProd>("validate", function (next) {
  if (!this.slug && this.name?.en) {
    this.slug = this.name.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const EnsotekProd: Model<IEnsotekProd> =
  models.EnsotekProd || model<IEnsotekProd>("EnsotekProd", EnsotekProdSchema);


export { EnsotekProd };
