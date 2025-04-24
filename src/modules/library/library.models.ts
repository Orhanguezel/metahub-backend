import mongoose, { Schema, Document } from "mongoose";

export interface ILibraryItem extends Document {
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

const librarySchema: Schema = new Schema<ILibraryItem>(
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

// 🔁 Slug otomatik üretimi (ilk geçerli başlığa göre)
librarySchema.pre("validate", function (this: ILibraryItem, next) {
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

const LibraryItem = mongoose.model<ILibraryItem>("LibraryItem", librarySchema);
export default LibraryItem;
