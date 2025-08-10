import { Schema, Model, models, model } from "mongoose";
import type { IApartment, IApartmentImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";
import { isValidObjectId as isValidObjId } from "@/core/utils/validation";

// --- i18n string field (aynen) ---
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

// --- Images (aynen) ---
const ApartmentImageSchema = new Schema<IApartmentImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

// --- Address & Geo ---
const AddressSchema = new Schema(
  {
    street: String,
    number: String,
    district: String,
    city: { type: String, required: true },
    state: String,
    zip: String,
    country: { type: String, required: true }, // ISO-2 (DE/TR/…)
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

// --- Contact (Responsible) ---
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

// --- Service assignment & fees ---
const ServiceAssignmentSchema = new Schema(
  {
    service: { type: Schema.Types.ObjectId, ref: "services", required: true },
    name: { type: Object }, // TranslatedLabel snapshot
    priceSnapshot: { type: Number, min: 0 },
    durationMinutesSnapshot: { type: Number, min: 0 },
    period: {
      every: { type: Number, required: true, min: 1 },
      unit: { type: String, enum: ["day", "week", "month"], required: true },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    },
    lastPerformedAt: Date,
    nextPlannedAt: Date,
    isActive: { type: Boolean, default: true },
    notes: { type: Object }, // TranslatedLabel
  },
  { _id: false }
);

const FeeSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["dues", "cleaning", "security", "trash", "custom"],
      required: true,
    },
    label: { type: Object }, // TranslatedLabel
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "EUR" },
    period: {
      type: String,
      enum: ["once", "weekly", "monthly", "quarterly", "yearly"],
      required: true,
    },
    validFrom: Date,
    validTo: Date,
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

// --- Apartment ---
const ApartmentSchema = new Schema<IApartment>(
  {
    // i18n content
    title: localizedStringField(),
    content: localizedStringField(),

    // multi-tenant + url
    tenant: { type: String, required: true, index: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true, // unique kaldırıldı; compound unique aşağıda
    },

    // media
    images: { type: [ApartmentImageSchema], default: [], required: true },

    // classification
    category: {
      type: Schema.Types.ObjectId,
      ref: "apartmentcategory",
      required: true,
    },

    // location
    address: { type: AddressSchema, required: true },
    location: { type: GeoPointSchema },

    // relations
    customer: { type: Schema.Types.ObjectId, ref: "customer" },
    contact: { type: ContactSchema, required: true },

    // services & fees
    services: { type: [ServiceAssignmentSchema], default: [] },
    fees: { type: [FeeSchema], default: [] },

    // publish & status
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// --- Indexes ---
ApartmentSchema.index({ tenant: 1, slug: 1 }, { unique: true });
ApartmentSchema.index({ "address.city": 1, "address.zip": 1, tenant: 1 });
ApartmentSchema.index({ location: "2dsphere" });
ApartmentSchema.index({ "address.fullText": "text" });

// --- Helpers ---
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
  if (this.isModified("address")) {
    const a = this.address || ({} as any);
    if (!a.fullText) {
      const parts = [a.street && `${a.street} ${a.number || ""}`, a.zip, a.city, a.country]
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
