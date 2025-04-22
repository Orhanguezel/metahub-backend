import mongoose, { Schema, Document, Types } from "mongoose";

// 🎯 Article Type
export interface IArticle extends Document {
  title: string;
  slug: string;
  summary: string;
  content: string;
  images: string[];
  category?: string;
  tags: string[];
  language: "tr" | "en" | "de";
  isPublished: boolean;
  publishedAt?: Date;
  author?: string;
  comments: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const articleSchema: Schema = new Schema<IArticle>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, required: true, maxlength: 300 },
    content: { type: String, required: true },
    images: [{ type: String, required: true }],
    category: { type: String },
    tags: [{ type: String }],
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    author: { type: String },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  },
  {
    timestamps: true,
  }
);

// 🔁 Otomatik slug üretme
articleSchema.pre("validate", function (this: IArticle, next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

const Article = mongoose.model<IArticle>("Article", articleSchema);
export default Article;
