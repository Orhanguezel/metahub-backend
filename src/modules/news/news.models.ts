import mongoose, { Schema, Document, Types } from "mongoose";

export interface INews extends Document {
  title: string;
  slug: string;
  summary: string;
  content: string;
  images: string[];
  tags: string[];
  author?: string;
  category?: string;
  language: "tr" | "en" | "de";
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const newsSchema: Schema = new Schema<INews>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    summary: { type: String, required: true, maxlength: 300 },
    content: { type: String, required: true },
    images: [{ type: String, required: true }],
    tags: [{ type: String }],
    author: { type: String },
    category: { type: String },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  },
  {
    timestamps: true,
  }
);

// 🔁 Otomatik slug üretimi
newsSchema.pre("validate", function (this: INews, next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

const News = mongoose.model<INews>("News", newsSchema);
export default News;
