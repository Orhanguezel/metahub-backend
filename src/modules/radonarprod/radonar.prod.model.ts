import { Schema, Document, Model, Types, models, model } from "mongoose";

// ✅ Image interface
export interface IRadonarProdImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

// ✅ Ana interface
export interface IRadonarProd extends Document {
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
  brand: string;
  price: number;
  stock: number;
  stockThreshold?: number;
  category: Types.ObjectId;
  tags?: string[];
  images: IRadonarProdImage[];
  frameMaterial?: string;
  brakeType?: string;
  wheelSize?: number;
  gearCount?: number;
  suspensionType?: string;
  color?: string[];
  weightKg?: number;
  isElectric?: boolean;
  batteryRangeKm?: number;
  motorPowerW?: number;
  comments?: Types.ObjectId[];
  likes?: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Image schema
const RadonarProdImageSchema = new Schema<IRadonarProdImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);


const RadonarProdSchema = new Schema<IRadonarProd>(
  {
    name: {
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
    brand: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0 },
    stockThreshold: { type: Number, default: 5 },
    category: { type: Schema.Types.ObjectId, ref: "RadonarCategory", required: true },
    tags: [{ type: String }],
    images: { type: [RadonarProdImageSchema], default: [] },
    frameMaterial: { type: String },
    brakeType: { type: String },
    wheelSize: { type: Number },
    gearCount: { type: Number },
    suspensionType: { type: String },
    color: [{ type: String }],
    weightKg: { type: Number },
    isElectric: { type: Boolean, default: false },
    batteryRangeKm: { type: Number },
    motorPowerW: { type: Number },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    likes: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Slug middleware
RadonarProdSchema.pre<IRadonarProd>("validate", function (next) {
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

// ✅ Guarded model
const RadonarProd: Model<IRadonarProd> =
  models.RadonarProd || model<IRadonarProd>("RadonarProd", RadonarProdSchema);

export default RadonarProd;
export { RadonarProd };
