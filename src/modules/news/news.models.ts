import mongoose, { Schema, Types, Model, models } from "mongoose";

interface INewsImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface INews  {
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
  images: INewsImage[];
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

const newsImageSchema = new Schema<INewsImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

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
    images: { type: [newsImageSchema], default: [] },
    tags: [{ type: String }],
    author: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewsCategory",
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

export { News };


