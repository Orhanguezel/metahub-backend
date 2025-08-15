import mongoose, { Schema, Model, models, SchemaTypeOptions } from "mongoose";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { INeighborhood } from "./types";

/* i18n name alanlarını boş string ile başlatıyoruz */
const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang as SupportedLocale] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<SupportedLocale, any>);

const GeoSchema = new Schema(
  { lat: { type: Number }, lng: { type: Number } },
  { _id: false }
);

const CodesSchema = new Schema(
  {
    cityCode: { type: String, trim: true },
    districtCode: { type: String, trim: true },
    external: { type: Object },
  },
  { _id: false }
);

const NeighborhoodSchema = new Schema<INeighborhood>(
  {
    name: nameFields,

    tenant: { type: String, required: true, index: true },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // v1 alanları
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    zip: { type: String, trim: true },

    // v2 ekleri
    codes: { type: CodesSchema },
    geo: { type: GeoSchema },
    aliases: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    sortOrder: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* En az bir dilde name dolu mu? slug yoksa üret */
NeighborhoodSchema.pre("validate", function (next) {
  const name = this.name as Record<string, unknown> | undefined;
  const hasAny =
    name && Object.values(name).some((v) => typeof v === "string" && String(v).trim().length > 0);

  if (!hasAny) {
    return next(
      new mongoose.Error.ValidatorError({ message: "At least one localized name is required" })
    );
  }

  if (!this.slug && name) {
    const firstValidName =
      Object.values(name).find((val) => typeof val === "string" && String(val).trim()) || "";
    this.slug = String(firstValidName)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

/* Indexler */
NeighborhoodSchema.index({ tenant: 1, slug: 1 }, { unique: true });
NeighborhoodSchema.index({ tenant: 1, isActive: 1, sortOrder: 1 });
NeighborhoodSchema.index({ tenant: 1, city: 1, district: 1, zip: 1 });
NeighborhoodSchema.index({ tenant: 1, "codes.cityCode": 1, "codes.districtCode": 1 });
NeighborhoodSchema.index({ tenant: 1, tags: 1 });

export const Neighborhood: Model<INeighborhood> =
  (models.neighborhood as Model<INeighborhood>) ||
  mongoose.model<INeighborhood>("neighborhood", NeighborhoodSchema);
