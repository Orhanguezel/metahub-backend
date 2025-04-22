import mongoose, { Schema, Document } from "mongoose";

export interface ILibraryItem extends Document {
  title: string;
  slug: string;
  description?: string;
  category?: string;
  language?: "tr" | "en" | "de";
  fileUrl: string;
  fileType: "pdf" | "docx" | "pptx" | "image" | "other";
  tags?: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const librarySchema: Schema = new Schema<ILibraryItem>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    category: { type: String },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
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

// 🔁 Slug otomatik üretimi
librarySchema.pre("validate", function (this: ILibraryItem, next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

const LibraryItem = mongoose.model<ILibraryItem>("LibraryItem", librarySchema);
export default LibraryItem;
