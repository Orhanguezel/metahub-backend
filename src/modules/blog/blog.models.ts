import mongoose, { Schema, Document, Types, Model, models } from "mongoose";

export interface IBlogImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IBlog extends Document {
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
  images: IBlogImage[];
  tags: string[];
  author?: string;
  category?: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  isActive: boolean; // soft delete desteği
  createdAt: Date;
  updatedAt: Date;
}

const BlogImageSchema = new Schema<IBlogImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const BlogSchema: Schema = new Schema<IBlog>(
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
    images: { type: [BlogImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogCategory",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    isActive: { type: Boolean, default: true }, // soft delete desteği
  },
  {
    timestamps: true,
  }
);

// ✅ Slug oluşturucu middleware
BlogSchema.pre("validate", function (this: IBlog, next) {
  const baseTitle = this.title?.en || this.title?.de || this.title?.tr || "Blog";
  if (!this.slug && baseTitle) {
    this.slug = baseTitle
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

// ✅ Guard + Model Type
const Blog: Model<IBlog> =
  (models.Blog as Model<IBlog>) || mongoose.model<IBlog>("Blog", BlogSchema);

export default Blog;
export { Blog };


