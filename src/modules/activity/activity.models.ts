import mongoose, { Schema, Document, Types, Model, models } from "mongoose";
import slugify from "slugify";

export interface IActivityImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IActivity {
  title: {
    tr?: string;
    en?: string;
    de?: string;
  };
  tenant: string; // Optional tenant field for multi-tenancy
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
  images: IActivityImage[];
  tags: string[];
  category?: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityImageSchema = new Schema<IActivityImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const ActivitySchema: Schema = new Schema<IActivity>(
  {
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    tenant: { type: String, required: true, index: true },
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
    images: { type: [ActivityImageSchema], default: [] },
    tags: [{ type: String, trim: true }],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityCategory",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Slug middleware
ActivitySchema.pre("validate", async function (next) {
  const doc = this as unknown as IActivity;

  if (!doc.slug) {
    const base =
      doc.title?.en?.toLowerCase() ||
      doc.title?.tr?.toLowerCase() ||
      doc.title?.de?.toLowerCase() ||
      "service";

    let slug = slugify(base, { lower: true, strict: true });
    let count = 1;

    while (await Activity.exists({ slug })) {
      slug = `${slugify(base, { lower: true, strict: true })}-${count++}`;
    }

    doc.slug = slug;
  }

  next();
});

const Activity: Model<IActivity> =
  models.Activity || mongoose.model<IActivity>("Activity", ActivitySchema);

export { Activity };
