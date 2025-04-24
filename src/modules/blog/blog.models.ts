import { Schema, model, Document, Types } from "mongoose";

// Blog kategorileri (Almanca)
type BlogCategory = "ernaehrung" | "parasiten" | "vegan" | "allgemein";

interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  summary: string;
  images: string[];
  tags: string[];
  category: BlogCategory;
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
        validator: function (v: string[]) {
          return v.length > 0;
        },
        message: "At least one image is required.",
      },
      default: ["blog.png"],
    },
    tags: [{ type: String }],
    category: {
      type: String,
      enum: ["ernaehrung", "parasiten", "vegan", "allgemein"],
      default: "allgemein",
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

export default model<IBlog>("Blog", blogSchema);
export { IBlog, BlogCategory };


