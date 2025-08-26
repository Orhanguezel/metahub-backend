import { Schema, Model, models, model } from "mongoose";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type {
  IBranch, IGeoPoint, IOpeningHour, IDeliveryZone, IMoney, TranslatedLabel
} from "./types";

/* i18n string alanı (apartment paternine birebir) */
const localizedStringField = () => {
  const fields: Record<SupportedLocale, any> = {} as any;
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale as SupportedLocale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

/* Money */
const MoneySchema = new Schema<IMoney>(
  {
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "TRY", enum: ["TRY", "EUR", "USD"] },
  },
  { _id: false }
);

/* Address */
const AddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    number: { type: String, trim: true },
    district: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true }, // ISO-2
    fullText: { type: String, trim: true },
  },
  { _id: false }
);

/* Geo Point */
const GeoPointSchema = new Schema<IGeoPoint>(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number], // [lng, lat]
      validate: { validator: (v: number[]) => Array.isArray(v) && v.length === 2 },
    },
  },
  { _id: false }
);

/* Opening Hours */
const OpeningHourSchema = new Schema<IOpeningHour>(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, required: true, trim: true },  // "HH:mm"
    close: { type: String, required: true, trim: true }, // "HH:mm"
  },
  { _id: false }
);

/* Delivery Zone (Polygon) */
const DeliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    name: { type: String, trim: true },
    polygon: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
      },
      coordinates: { type: [[[Number]]], required: true }, // [[[lng,lat],...]]
    } as any,
    fee: { type: MoneySchema, default: () => ({ amount: 0, currency: "EUR" }) },
  },
  { _id: false }
);

/* Branch */
const BranchSchema = new Schema<IBranch>(
  {
    tenant: { type: String, required: true, index: true, trim: true },
    code: { type: String, required: true, trim: true },
    name: { type: Object, default: () => localizedStringField() }, // TranslatedLabel

    address: { type: AddressSchema },
    location: { type: GeoPointSchema, required: true }, // 2dsphere

    services: {
      type: [String],
      enum: ["delivery", "pickup", "dinein"],
      required: true,
      validate: { validator: (arr: string[]) => Array.isArray(arr) && arr.length > 0 },
    },

    openingHours: { type: [OpeningHourSchema], default: [] },
    minPrepMinutes: { type: Number, default: 15, min: 0, max: 240 },

    deliveryZones: { type: [DeliveryZoneSchema], default: [] },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

/* Indexler */
BranchSchema.index({ tenant: 1, code: 1 }, { unique: true });
BranchSchema.index({ location: "2dsphere" });

/* Address fullText otomatik doldurma */
BranchSchema.pre("save", function (next) {
  const anyThis = this as any;
  if (anyThis.isModified("address")) {
    const a = anyThis.address || {};
    if (!a.fullText) {
      const parts = [
        a.street && `${a.street} ${a.number || ""}`,
        a.zip,
        a.city,
        a.country,
      ]
        .filter(Boolean)
        .map((s: any) => String(s).trim());
      anyThis.address = anyThis.address || {};
      anyThis.address.fullText = parts.join(", ");
    }
  }
  next();
});

export const Branch: Model<IBranch> =
  (models.branch as Model<IBranch>) || model<IBranch>("branch", BranchSchema);

export { BranchSchema, AddressSchema, GeoPointSchema, OpeningHourSchema, DeliveryZoneSchema, MoneySchema };
