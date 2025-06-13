import { Schema, Model, models, model } from "mongoose";

// ✅ Interface
export interface ILibrary {
  title: {
    tr?: string;
    en?: string;
    de?: string;
  };
  slug: string;
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  category?: string;
  fileUrl: string;
  fileType: "pdf" | "docx" | "pptx" | "image" | "other";
  tags?: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Schema
const LibrarySchema = new Schema<ILibrary>(
  {
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    slug: { type: String, required: true, unique: true },
    description: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    category: { type: String },
    fileUrl: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["pdf", "docx", "pptx", "image", "other"],
      default: "pdf",
    },
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// ✅ Slug middleware
LibrarySchema.pre("validate", function (this: ILibrary, next) {
  const baseTitle =
    this.title?.en || this.title?.de || this.title?.tr || "untitled";
  if (!this.slug && baseTitle) {
    this.slug = baseTitle
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

// ✅ Guard + Model Type
const Library: Model<ILibrary> =
  (models.Library as Model<ILibrary>) ||
  model<ILibrary>("Library", LibrarySchema);

// ✅ Export
export { Library };
