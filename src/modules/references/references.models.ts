import mongoose, { Schema, Document } from "mongoose";

export interface IReference extends Document {
  companyName: string;
  slug: string;
  url?: string;
  logos: string[];
  sector: string;
  country?: string;
  description?: string;
  year?: number;
  tags?: string[];
  language?: "tr" | "en" | "de";
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const referenceSchema: Schema = new Schema<IReference>(
  {
    companyName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    url: { type: String },
    logos: [{ type: String,required: true }],
    sector: { type: String, required: true },
    country: { type: String },
    description: { type: String },
    year: { type: Number },
    tags: [{ type: String }],
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
    isPublished: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// 🔁 Slug üretimi
referenceSchema.pre("validate", function (this: IReference, next) {
  if (!this.slug && this.companyName) {
    this.slug = this.companyName
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
  next();
});

const Reference = mongoose.model<IReference>("Reference", referenceSchema);
export default Reference;
