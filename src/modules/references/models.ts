import mongoose, { Schema, Document, Types, Model, models } from "mongoose";
import slugify from "slugify";

// Image tipi
export interface IReferenceImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

// Reference tipi
export interface IReference extends Document {
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
  images: IReferenceImage[];
  tags: string[];
  // Sektör = kategori olarak yönetilecek
  category: Types.ObjectId; // ZORUNLU! (sektör)
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const referenceImageSchema = new Schema<IReferenceImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const referenceSchema = new Schema<IReference>(
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
    images: { type: [referenceImageSchema], default: [] },
    tags: [{ type: String, trim: true }],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReferenceCategory", // Sektör kategorisi
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Slug middleware
referenceSchema.pre("validate", async function (next) {
  const doc = this as IReference;

  if (!doc.slug) {
    const base =
      doc.title?.en?.toLowerCase() ||
      doc.title?.tr?.toLowerCase() ||
      doc.title?.de?.toLowerCase() ||
      "reference";

    let slug = slugify(base, { lower: true, strict: true });
    let count = 1;

    while (await Reference.exists({ slug })) {
      slug = `${slugify(base, { lower: true, strict: true })}-${count++}`;
    }

    doc.slug = slug;
  }

  next();
});

const Reference: Model<IReference> =
  models.Reference || mongoose.model<IReference>("Reference", referenceSchema);

export { Reference };
