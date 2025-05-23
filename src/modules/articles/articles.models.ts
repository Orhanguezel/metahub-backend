import mongoose, { Schema, Types, Model, models } from "mongoose";

interface IArticlesImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IArticles  {
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
  images: IArticlesImage[];
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

const ArticlesImageSchema = new Schema<IArticlesImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const ArticlesSchema: Schema = new Schema<IArticles>(
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
    images: { type: [ArticlesImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArticlesCategory",
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
ArticlesSchema.pre("validate", function (this: IArticles, next) {
  const baseTitle = this.title?.en || this.title?.de || this.title?.tr || "Articles";
  if (!this.slug && baseTitle) {
    this.slug = baseTitle
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

// ✅ Guard + Model Type
const Articles: Model<IArticles> =
  (models.Articles as Model<IArticles>) || mongoose.model<IArticles>("Articles", ArticlesSchema);


export { Articles,ArticlesImageSchema, ArticlesSchema };


