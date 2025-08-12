import { Schema, Model, models, model } from "mongoose";
import type { IContact } from "./types";

const EmailSchema = new Schema(
  { label: String, value: { type: String, trim: true }, primary: Boolean },
  { _id: false }
);
const PhoneSchema = new Schema(
  { label: String, value: { type: String, trim: true }, primary: Boolean },
  { _id: false }
);
const AddressSchema = new Schema(
  {
    label: String,
    street: String, number: String, district: String,
    city: String, state: String, zip: String, country: String,
  },
  { _id: false }
);
const BillingSchema = new Schema(
  {
    iban: String,
    bankName: String,
    taxNumber: String,
    currency: String,
    defaultDueDayOfMonth: { type: Number, min: 1, max: 28 },
  },
  { _id: false }
);

const slugify = (s: string) =>
  s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");

const ContactSchema = new Schema<IContact>(
  {
    tenant: { type: String, required: true, index: true },
    kind: { type: String, enum: ["person", "organization"], required: true },

    firstName: String,
    lastName: String,

    legalName: String,
    tradeName: String,

    slug: { type: String, required: true, trim: true, lowercase: true },

    emails: { type: [EmailSchema], default: [] },
    phones: { type: [PhoneSchema], default: [] },
    addresses: { type: [AddressSchema], default: [] },
    billing: { type: BillingSchema },

    notes: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexler
ContactSchema.index({ tenant: 1, slug: 1 }, { unique: true });
ContactSchema.index({ tenant: 1, kind: 1, isActive: 1 });
ContactSchema.index({ tenant: 1, "emails.value": 1 }); // arama için
ContactSchema.index({ tenant: 1, "phones.value": 1 });

// Otomatik slug
ContactSchema.pre("validate", function (next) {
  if (!this.slug) {
    const base =
      this.kind === "organization"
        ? this.tradeName || this.legalName
        : [this.firstName, this.lastName].filter(Boolean).join(" ");
    this.slug = slugify(base || "contact");
  } else {
    this.slug = slugify(this.slug);
  }
  next();
});

// Normalize email/phone (lowercase + unique primary)
ContactSchema.pre("save", function (next) {
  if (Array.isArray(this.emails)) {
    this.emails = this.emails.map((e: any) => ({
      ...e,
      value: e.value?.toLowerCase().trim(),
    }));
    // birden fazla primary varsa ilkini bırak
    let firstPrimary = false;
    this.emails = this.emails.map((e: any) => {
      if (e.primary && !firstPrimary) { firstPrimary = true; return e; }
      return { ...e, primary: false };
    });
  }
  if (Array.isArray(this.phones)) {
    this.phones = this.phones.map((p: any) => ({ ...p, value: p.value?.trim() }));
    let firstPrimary = false;
    this.phones = this.phones.map((p: any) => {
      if (p.primary && !firstPrimary) { firstPrimary = true; return p; }
      return { ...p, primary: false };
    });
  }
  next();
});

export const Contact: Model<IContact> =
  models.contact || model<IContact>("contact", ContactSchema);
