import { Schema, model, Document, Types } from "mongoose";

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  summary: string;
  images: string[];
  tags: string[];
  category: Types.ObjectId; 
  author: string;
  isPublished?: boolean;
  publishedAt?: Date;
  isActive: boolean;
  label: {
    tr: string;
    en: string;
    de: string;
  };
  comments: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    summary: { type: String, required: true, maxlength: 300 },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one image is required.",
      },
      default: ["blog.png"],
    },
    tags: [{ type: String }],
    category: {
      type: Schema.Types.ObjectId,
      ref: "BlogCategory", // ✅ BlogCategory modeline bağlandı
      required: true,
    },
    author: {
      type: String,
      default: "Anastasia König",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true }
);

// 🔁 Slug otomatik üretimi
blogSchema.pre("validate", function (this: IBlog, next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const Blog = model<IBlog>("Blog", blogSchema);

export default Blog;
