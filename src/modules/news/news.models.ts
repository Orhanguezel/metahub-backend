import mongoose, { Schema, Document, Types, Model, models } from "mongoose";

export interface INews extends Document {
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
  images: string[];
  tags: string[];
  author?: string;
  category?: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  comments: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const newsSchema: Schema = new Schema<INews>(
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
    images: [{ type: String, required: true }],
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewsCategory",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  },
  {
    timestamps: true,
  }
);

// ✅ Slug oluşturucu middleware
newsSchema.pre("validate", function (this: INews, next) {
  const baseTitle = this.title?.en || this.title?.de || this.title?.tr || "news";
  if (!this.slug && baseTitle) {
    this.slug = baseTitle
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

// ✅ Guard + Model Type
const News: Model<INews> =
  (models.News as Model<INews>) || mongoose.model<INews>("News", newsSchema);

export default News;
export { News };
