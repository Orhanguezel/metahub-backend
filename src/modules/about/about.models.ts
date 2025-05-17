import mongoose, { Schema, Document, Types, Model, models } from "mongoose";
import slugify from "slugify";

export interface IAboutImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IAbout  {
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
  images?: IAboutImage[];
  category?: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AboutImageSchema = new Schema<IAboutImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const AboutSchema: Schema = new Schema<IAbout>(
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
    images: { type: [AboutImageSchema], default: [] },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AboutCategory",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Slug middleware
AboutSchema.pre("validate", async function (next) {
  const doc = this as unknown as IAbout;

  if (!doc.slug) {
    const base =
      doc.title?.en?.toLowerCase() ||
      doc.title?.tr?.toLowerCase() ||
      doc.title?.de?.toLowerCase() ||
      "service";

    let slug = slugify(base, { lower: true, strict: true });
    let count = 1;

    while (await About.exists({ slug })) {
      slug = `${slugify(base, { lower: true, strict: true })}-${count++}`;
    }

    doc.slug = slug;
  }

  next();
});




const About: Model<IAbout> =
  models.About || mongoose.model<IAbout>("About", AboutSchema);

export default About;
export { About };
