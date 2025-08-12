import { Schema, Model, models, model } from "mongoose";
import type { IApartment, IApartmentImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";
import { isValidObjectId as isValidObjId } from "@/core/utils/validation";

/* i18n string alanı */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

/* Images */
const ApartmentImageSchema = new Schema<IApartmentImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

/* Address & Geo */
const AddressSchema = new Schema(
  {
    street: String,
    number: String,
    district: String,
    city: { type: String, required: true },
    state: String,
    zip: String,
    country: { type: String, required: true }, // ISO-2
    fullText: String,
  },
  { _id: false }
);

const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number] }, // [lng, lat]
  },
  { _id: false }
);

/* Contact (snapshot + opsiyonel referanslar) */
const ContactSchema = new Schema(
  {
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      set: (v: any) => (isValidObjId(v) ? v : undefined),
    },
    userRef: {
      type: Schema.Types.ObjectId,
      ref: "user",
      set: (v: any) => (isValidObjId(v) ? v : undefined),
    },
    name: { type: String, required: true, trim: true },
    phone: String,
    email: String,
    role: String,
  },
  { _id: false }
);

/* --- Apartment (sade) --- */
const ApartmentSchema = new Schema<IApartment>(
  {
    // i18n içerik
    title: localizedStringField(),
    content: localizedStringField(),

    // multi-tenant + url
    tenant: { type: String, required: true, index: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true, // unique => compound aşağıda
    },

    // medya
    images: { type: [ApartmentImageSchema], default: [], required: true },

    // sınıflandırma
    category: {
      type: Schema.Types.ObjectId,
      ref: "apartmentcategory",
      required: true,
    },

    // konum
    address: { type: AddressSchema, required: true },
    location: { type: GeoPointSchema },

    // ilişkiler
    customer: { type: Schema.Types.ObjectId, ref: "customer" },
    contact: { type: ContactSchema, required: true },

    // yayın & durum
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* Indexes */
ApartmentSchema.index({ tenant: 1, slug: 1 }, { unique: true });
ApartmentSchema.index({ "address.city": 1, "address.zip": 1, tenant: 1 });
ApartmentSchema.index({ location: "2dsphere" });
ApartmentSchema.index({ "address.fullText": "text" });
ApartmentSchema.index({ tenant: 1, isPublished: 1, isActive: 1 });

/* Helpers */
ApartmentSchema.pre("validate", function (next) {
  if (!this.slug && this.title?.en) {
    this.slug = this.title.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

ApartmentSchema.pre("save", function (next) {
  // address.fullText otomatik üret
  if (this.isModified("address")) {
    const a = this.address || ({} as any);
    if (!a.fullText) {
      const parts = [
        a.street && `${a.street} ${a.number || ""}`,
        a.zip,
        a.city,
        a.country,
      ]
        .filter(Boolean)
        .map((s) => String(s).trim());
      this.address.fullText = parts.join(", ");
    }
  }
  next();
});

const Apartment: Model<IApartment> =
  models.apartment || model<IApartment>("apartment", ApartmentSchema);

export { Apartment, ApartmentImageSchema, ApartmentSchema };
