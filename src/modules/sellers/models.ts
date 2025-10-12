// src/modules/sellers/models.ts
import { Schema, model, models, type Model } from "mongoose";
import type { ISeller, ISellerImage } from "./types";

/** basit slug */
const slugify = (s: string) =>
  s?.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "") || "seller";

/** telefon normalize */
const normalizePhone = (s?: string) => {
  if (!s) return s;
  let v = s.trim().replace(/[\s()-]/g, "");
  if (v.startsWith("00")) v = "+" + v.slice(2);
  v = v.replace(/(?!^\+)\+/g, "");
  v = v.replace(/[^\d+]/g, "");
  return v;
};

const SellerImageSchema = new Schema<ISellerImage>({
  url: { type: String, required: true, trim: true },
  thumbnail: { type: String, required: true, trim: true },
  webp: { type: String, trim: true },
  publicId: { type: String, trim: true },
}, { _id: false });

const SellerBillingSchema = new Schema({
  taxNumber: { type: String, trim: true },
  iban: { type: String, trim: true },
  defaultCurrency: { type: String, enum: ["USD", "EUR", "TRY"] },
  paymentTermDays: { type: Number, min: 0, max: 365 },
  defaultDueDayOfMonth: { type: Number, min: 1, max: 28 },
}, { _id: false });

const SellerSchema = new Schema<ISeller>({
  tenant: { type: String, required: true, index: true },
  kind: { type: String, enum: ["person", "organization"], default: "person" },

  companyName: { type: String, trim: true },
  contactName: { type: String, required: true, trim: true },

  images: { type: [SellerImageSchema], default: [] },

  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: false, trim: true },

  slug: { type: String, required: true, trim: true, lowercase: true },

  userRef: { type: Schema.Types.ObjectId, ref: "user", default: undefined },
  addresses: [{ type: Schema.Types.ObjectId, ref: "address" }],

  /** Satıcının hizmet verdiği kategoriler (ref: category) */
  categories: {
    type: [{ type: Schema.Types.ObjectId, ref: "category" }],
    default: undefined, // gönderilmemişse field oluşturulmasın
  },

  billing: { type: SellerBillingSchema, default: undefined },

  tags: [{ type: String, trim: true }],
  notes: { type: String, trim: true },

  avatarUrl: { type: String, trim: true },
  coverUrl: { type: String, trim: true },
  location: {
    city: { type: String, trim: true },
    country: { type: String, trim: true },
  },

  rating: { type: Number, min: 0, max: 5, default: 4.7 },
  isActive: { type: Boolean, required: true, default: true },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/* ---- indexler ---- */
SellerSchema.index({ tenant: 1, email: 1 }, { unique: true });

// ⬇️ phone now partial unique (opsiyonel alan için)
SellerSchema.index(
  { tenant: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $exists: true, $ne: null } } }
);

SellerSchema.index({ tenant: 1, slug: 1 }, { unique: true });
SellerSchema.index({ tenant: 1, isActive: 1 });
SellerSchema.index({ tenant: 1, companyName: 1, contactName: 1 });
// kategori bazlı sorgular için yardımcı index
SellerSchema.index({ tenant: 1, categories: 1 });

SellerSchema.index(
  { tenant: 1, userRef: 1 },
  { unique: true, partialFilterExpression: { userRef: { $exists: true, $ne: null } } }
);

/** Virtual: displayName */
SellerSchema.virtual("displayName").get(function (this: any) {
  return this.companyName || this.contactName || this.email?.split("@")?.[0] || "seller";
});

/** slug & normalize & tags */
SellerSchema.pre("validate", function (next) {
  if (!this.slug || !this.slug.trim()) {
    const base =
      this.companyName?.trim() ||
      this.contactName?.trim() ||
      this.email?.split("@")[0] ||
      "seller";
    this.slug = slugify(base);
  } else {
    this.slug = slugify(this.slug);
  }
  next();
});

SellerSchema.pre("save", function (next) {
  if (this.email) this.email = this.email.trim().toLowerCase();
  if (this.phone) this.phone = normalizePhone(this.phone);

  if (Array.isArray(this.tags)) {
    this.tags = Array.from(
      new Set(this.tags.filter(Boolean).map((t: any) => String(t).trim().toLowerCase()))
    );
  }
  next();
});

export const Seller: Model<ISeller> =
  models.seller || model<ISeller>("seller", SellerSchema);

export default Seller;
