import { Schema, Model, models, model, Types } from "mongoose";
import type {
  IApartment,
  IApartmentImage,
  IServiceBinding,
  IApartmentOps,
  IApartmentLinks,
  IApartmentOpsNotifyPrefs
} from "./types";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { isValidObjectId as isValidObjId } from "@/core/utils/validation";

/* i18n string alanı */
const localizedStringField = () => {
  const fields: Record<SupportedLocale, any> = {} as any;
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale as SupportedLocale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

/* Images */
const ApartmentImageSchema = new Schema<IApartmentImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true }
  },
  { _id: false }
);

/* Address & Geo */
const AddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    number: { type: String, trim: true },
    district: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, required: true, trim: true }, // ISO-2
    fullText: { type: String, trim: true }
  },
  { _id: false }
);

const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],                // [lng, lat]
      validate: { validator: (v: number[]) => Array.isArray(v) && v.length === 2 }
    }
  },
  { _id: false }
);

/* Place refs */
const PlaceSchema = new Schema(
  {
    neighborhood: { type: Schema.Types.ObjectId, ref: "neighborhood" },
    cityCode: { type: String, trim: true },
    districtCode: { type: String, trim: true },
    zip: { type: String, trim: true }
  },
  { _id: false }
);

/* Snapshots */
const SnapshotsSchema = new Schema(
  {
    neighborhoodName: { type: Object }, // TranslatedLabel
    managerName: { type: String, trim: true },
    serviceNames: { type: [Object], default: [] }, // TranslatedLabel[]
    lastPriceLabel: { type: String, trim: true }
  },
  { _id: false }
);

/* YÖNETİCİ snapshot (userRef kaldırıldı) */
const ContactSchema = new Schema(
  {
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      set: (v: any) => (isValidObjId(v) ? v : undefined)
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    role: { type: String, trim: true }
  },
  { _id: false }
);

/* Service Binding */
const ServiceBindingSchema = new Schema<IServiceBinding>(
  {
    service: { type: Schema.Types.ObjectId, ref: "servicecatalog", required: true },
    schedulePlan: { type: Schema.Types.ObjectId, ref: "scheduleplan" },
    operationTemplate: { type: Schema.Types.ObjectId, ref: "operationtemplate" },
    priceListItem: { type: Schema.Types.ObjectId, ref: "pricelistitem" },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true }
  },
  { _id: false, timestamps: false }
);

/* Ops notify prefs */
const OpsNotifySchema = new Schema<IApartmentOpsNotifyPrefs>(
  {
    managerOnJobCompleted: { type: Boolean, default: true },
    managerOnJobAssigned: { type: Boolean, default: false },
    employeeOnJobAssigned: { type: Boolean, default: true }
  },
  { _id: false }
);

/* Ops bloğu */
const OpsSchema = new Schema<IApartmentOps>(
  {
    employees: [{ type: Schema.Types.ObjectId, ref: "employee", index: true }],
    supervisor: { type: Schema.Types.ObjectId, ref: "employee", index: true },
    services: { type: [ServiceBindingSchema], default: [] },

    cleaningPlan: { type: Schema.Types.ObjectId, ref: "scheduleplan" },
    trashPlan: { type: Schema.Types.ObjectId, ref: "scheduleplan" },

    cashCollectionDay: {
      type: Number,
      min: 1,
      max: 31,
      validate: {
        validator: (v: any) => v == null || (Number.isInteger(v) && v >= 1 && v <= 31),
        message: "cashCollectionDay must be an integer between 1 and 31"
      }
    },

    notify: { type: OpsNotifySchema, default: {} }
  },
  { _id: false }
);

/* Links bloğu */
const LinksSchema = new Schema<IApartmentLinks>(
  {
    contracts: [{ type: Schema.Types.ObjectId, ref: "contract" }],
    billingPlans: [{ type: Schema.Types.ObjectId, ref: "billingplan" }],
    invoices: [{ type: Schema.Types.ObjectId, ref: "invoice" }],
    payments: [{ type: Schema.Types.ObjectId, ref: "payment" }],
    priceLists: [{ type: Schema.Types.ObjectId, ref: "pricelist" }],
    operationJobs: [{ type: Schema.Types.ObjectId, ref: "operationjob" }],
    operationTemplates: [{ type: Schema.Types.ObjectId, ref: "operationtemplate" }],
    timeEntries: [{ type: Schema.Types.ObjectId, ref: "timeentry" }],
    reportDefs: [{ type: Schema.Types.ObjectId, ref: "reportdefinition" }],
    reportRuns: [{ type: Schema.Types.ObjectId, ref: "reportrun" }],
    files: [{ type: Schema.Types.ObjectId, ref: "fileobject" }],
    contacts: [{ type: Schema.Types.ObjectId, ref: "contact" }]
  },
  { _id: false }
);

/* --- Apartment --- */
const ApartmentSchema = new Schema<IApartment>(
  {
    title: { type: Object, default: () => localizedStringField() },
    content: { type: Object, default: () => localizedStringField() },

    tenant: { type: String, required: true, index: true, trim: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },

    images: {
      type: [ApartmentImageSchema],
      validate: { validator: (arr: unknown[]) => Array.isArray(arr), message: "images must be an array" },
      default: []
    },

    place: { type: PlaceSchema },

    address: { type: AddressSchema, required: true },
    location: { type: GeoPointSchema },

    customer: { type: Schema.Types.ObjectId, ref: "customer" },
    contact: { type: ContactSchema, required: true },

    snapshots: { type: SnapshotsSchema },

    ops: { type: OpsSchema, default: {} },
    links: { type: LinksSchema, default: {} },

    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

/* Indexes */
ApartmentSchema.index({ tenant: 1, slug: 1 }, { unique: true });
ApartmentSchema.index({ tenant: 1, isPublished: 1, isActive: 1 });
ApartmentSchema.index({ "address.city": 1, "address.zip": 1, tenant: 1 });
ApartmentSchema.index({ location: "2dsphere" });
ApartmentSchema.index({ "address.fullText": "text" });
ApartmentSchema.index({ tenant: 1, "place.neighborhood": 1 });
ApartmentSchema.index({ tenant: 1, "place.cityCode": 1, "place.districtCode": 1 });
ApartmentSchema.index({ tenant: 1, "ops.employees": 1 });
ApartmentSchema.index({ tenant: 1, "ops.supervisor": 1 });
ApartmentSchema.index({ tenant: 1, "ops.services.service": 1, "ops.services.isActive": 1 });
ApartmentSchema.index({ tenant: 1, "ops.cashCollectionDay": 1 });

/* Helpers */
ApartmentSchema.pre("validate", function (next) {
  const anyThis = this as any;

  if (!anyThis.slug) {
    const titleEn: string | undefined = anyThis?.title?.en;
    if (titleEn) {
      anyThis.slug = String(titleEn)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
  }

  if (anyThis?.ops && typeof anyThis.ops.cashCollectionDay !== "undefined") {
    const d = anyThis.ops.cashCollectionDay;
    if (!(Number.isInteger(d) && d >= 1 && d <= 31)) {
      anyThis.ops.cashCollectionDay = undefined;
    }
  }

  next();
});

ApartmentSchema.pre("save", function (next) {
  const anyThis = this as any;
  if (anyThis.isModified("address")) {
    const a = anyThis.address || {};
    if (!a.fullText) {
      const parts = [
        a.street && `${a.street} ${a.number || ""}`,
        a.zip,
        a.city,
        a.country
      ].filter(Boolean).map((s: any) => String(s).trim());
      anyThis.address.fullText = parts.join(", ");
    }
  }
  next();
});

/* 🔸 JSON çıktıdaki tüm ObjectId'leri string yap (EJSON $oid sorununu önler) */
function stringifyIdsDeep(obj: any): any {
  if (obj == null) return obj;
  if (obj instanceof Types.ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyIdsDeep);
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) obj[k] = stringifyIdsDeep(obj[k]);
    return obj;
  }
  return obj;
}

const transform = (_: any, ret: any) => stringifyIdsDeep(ret);
ApartmentSchema.set("toJSON", { virtuals: true, versionKey: false, transform });
ApartmentSchema.set("toObject", { virtuals: true, versionKey: false, transform });

export const Apartment: Model<IApartment> =
  (models.apartment as Model<IApartment>) || model<IApartment>("apartment", ApartmentSchema);

export { ApartmentImageSchema, ApartmentSchema, ServiceBindingSchema, OpsSchema, LinksSchema, OpsNotifySchema };
