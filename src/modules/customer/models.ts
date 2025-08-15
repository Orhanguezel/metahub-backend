import { Schema, model, models, type Model } from "mongoose";
import type { ICustomer } from "./types";

/* helpers */
const slugify = (s: string) =>
  s?.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "") || "customer";

const normalizePhone = (s?: string) => {
  if (!s) return s;
  let v = s.trim().replace(/[\s()-]/g, "");
  if (v.startsWith("00")) v = "+" + v.slice(2);
  v = v.replace(/(?!^\+)\+/g, "");
  v = v.replace(/[^\d+]/g, "");
  return v;
};

const CustomerSchema = new Schema<ICustomer>(
  {
    tenant:      { type: String, required: true, index: true },
    kind:        { type: String, enum: ["person", "organization"], default: "person" },

    companyName: { type: String, trim: true },
    contactName: { type: String, required: true, trim: true },

    email:       { type: String, required: true, trim: true, lowercase: true },
    phone:       { type: String, required: true, trim: true },

    slug:        { type: String, required: true, trim: true, lowercase: true },

    // NEW
    userRef:     { type: Schema.Types.ObjectId, ref: "user", default: null },

    addresses:   [{ type: Schema.Types.ObjectId, ref: "address" }],

    billing: {
      taxNumber:            { type: String, trim: true },
      iban:                 { type: String, trim: true },
      defaultCurrency:      { type: String, enum: ["USD", "EUR", "TRY"] },
      paymentTermDays:      { type: Number, min: 0, max: 365 },
      defaultDueDayOfMonth: { type: Number, min: 1, max: 28 },
    },

    tags:     [{ type: String, trim: true }],
    notes:    { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

/* indexler */
CustomerSchema.index({ tenant: 1, email: 1 }, { unique: true });
CustomerSchema.index({ tenant: 1, phone: 1 }, { unique: true });
CustomerSchema.index({ tenant: 1, slug: 1 },  { unique: true });
CustomerSchema.index({ tenant: 1, isActive: 1 });
CustomerSchema.index({ tenant: 1, companyName: 1, contactName: 1 });

// NEW: aynı tenant içinde aynı userRef’e bağlı tek müşteri
CustomerSchema.index({ tenant: 1, userRef: 1 }, { unique: true, sparse: true });

/* slug & normalize & tags */
CustomerSchema.pre("validate", function (next) {
  if (!this.slug || !this.slug.trim()) {
    // NEW: userRef üzerinden doldurulmuş contactName yoksa email’den de türetebilir
    const base = this.companyName?.trim()
      || this.contactName?.trim()
      || this.email?.split("@")[0]
      || "customer";
    this.slug = slugify(base);
  } else {
    this.slug = slugify(this.slug);
  }
  next();
});

CustomerSchema.pre("save", function (next) {
  if (this.email) this.email = this.email.trim().toLowerCase();
  if (this.phone) this.phone = normalizePhone(this.phone);

  if (Array.isArray(this.tags)) {
    this.tags = Array.from(
      new Set(this.tags.filter(Boolean).map((t: any) => String(t).trim().toLowerCase()))
    );
  }
  next();
});

export const Customer: Model<ICustomer> =
  models.customer || model<ICustomer>("customer", CustomerSchema);
