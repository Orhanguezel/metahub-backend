import mongoose, { Schema, Document, Types, Model, models } from "mongoose";
import slugify from "slugify";

export interface IServicesImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IServices extends Document {
  title: {
    tr?: string;
    en?: string;
    de?: string;
  };
  slug: string;
  summary: {
    tr?: string;
    en?: string;
    de?: string;
  };
  content: {
    tr?: string;
    en?: string;
    de?: string;
  };
  images: IServicesImage[];
  tags: string[];
  author?: string;
  category?: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  price?: number;
  durationMinutes?: number;
}

const servicesImageSchema = new Schema<IServicesImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const servicesSchema: Schema = new Schema<IServices>(
  {
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    summary: {
      tr: { type: String, maxlength: 300 },
      en: { type: String, maxlength: 300 },
      de: { type: String, maxlength: 300 },
    },
    content: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    images: { type: [servicesImageSchema], default: [] },
    tags: [{ type: String, trim: true }],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServicesCategory",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    price: { type: Number },
    durationMinutes: { type: Number },
  },
  { timestamps: true }
);

// ✅ Slug middleware
servicesSchema.pre("validate", async function (next) {
  const doc = this as unknown as IServices;

  if (!doc.slug) {
    const base =
      doc.title?.en?.toLowerCase() ||
      doc.title?.tr?.toLowerCase() ||
      doc.title?.de?.toLowerCase() ||
      "service";

    let slug = slugify(base, { lower: true, strict: true });
    let count = 1;

    while (await Services.exists({ slug })) {
      slug = `${slugify(base, { lower: true, strict: true })}-${count++}`;
    }

    doc.slug = slug;
  }

  next();
});




const Services: Model<IServices> =
  models.Services || mongoose.model<IServices>("Services", servicesSchema);

export default Services;
export { Services };
