

// 📁 modules/apartment/models/apartment.model.ts

import mongoose, { Schema, Model, models } from "mongoose";
import slugify from "slugify";
import { IApartment, IApartmentImage } from "./types";

const ApartmentImageSchema = new Schema<IApartmentImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const ApartmentSchema: Schema = new Schema<IApartment>(
  {
    title: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: {
      tr: { type: String },
      en: { type: String },
      de: { type: String },
    },
    address: { type: String },
    rooms: { type: Number },
    price: { type: Number },
    floor: { type: Number },
    size: { type: Number },
    tags: [{ type: String }],
    images: { type: [ApartmentImageSchema], default: [] },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApartmentCategory",
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Slug middleware
ApartmentSchema.pre("validate", async function (next) {
  const doc = this as any;

  if (!doc.slug) {
    const base =
      doc.title?.en?.toLowerCase() ||
      doc.title?.tr?.toLowerCase() ||
      doc.title?.de?.toLowerCase() ||
      "apartment";

    let slug = slugify(base, { lower: true, strict: true });
    let count = 1;

    while (await Apartment.exists({ slug })) {
      slug = `${slugify(base, { lower: true, strict: true })}-${count++}`;
    }

    doc.slug = slug;
  }

  next();
});

const Apartment: Model<IApartment> =
  models.Apartment || mongoose.model<IApartment>("Apartment", ApartmentSchema);

export { Apartment };

