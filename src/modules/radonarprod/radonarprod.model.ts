import { Schema, Model, Types, models, model } from "mongoose";
import { IRadonarProd, IRadonarProdImage } from "@/modules/radonarprod/types";

// ✅ Image schema
const RadonarProdImageSchema = new Schema<IRadonarProdImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
    altText: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
  },
  { _id: false }
);

// ✅ Main schema
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
RadonarProdSchema.pre("validate", function (next) {
  // @ts-ignore
  if (!this.slug && this.name?.en) {
    // @ts-ignore
    this.slug = this.name.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const RadonarProd: Model<IRadonarProd> =
  models.RadonarProd || model<IRadonarProd>("RadonarProd", RadonarProdSchema);

export { RadonarProd };
