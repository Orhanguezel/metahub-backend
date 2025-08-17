// modules/offers/model.ts
import { Schema, model, models, type Model, type HydratedDocument } from "mongoose";
import type { IOffer } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/** Çok dilliler için dinamik default */
const multilangDefault = () => {
  const obj: Record<string, string> = {};
  for (const l of SUPPORTED_LOCALES) obj[l] = "";
  return obj;
};

const OfferItemSchema = new Schema(
  {
    // <<< SADE: sadece iki tip
    productType: { type: String, enum: ["ensotekprod", "sparepart"], required: true },
    ensotekprod: { type: Schema.Types.ObjectId, ref: "ensotekprod" },
    sparepart:   { type: Schema.Types.ObjectId, ref: "sparepart" },

    productName: { type: Object, required: true, default: () => multilangDefault() },
    quantity:    { type: Number, required: true, min: 1 },
    unitPrice:   { type: Number, required: true, min: 0 },
    customPrice: { type: Number, min: 0 },
    vat:         { type: Number, required: true, min: 0, max: 100, default: 19 },
    total:       { type: Number, required: true, min: 0 }, // line gross (hesaplanır)
  },
  { _id: false, strict: true }
);

// Ürün-referans tutarlılığı: productType ↔ ensotekprod/sparepart
OfferItemSchema.pre("validate", function (next) {
  const it: any = this;
  const t = it.productType;

  // İki referans birden dolu olmasın
  if (it.ensotekprod && it.sparepart) {
    return next(new Error("Offer item cannot have both ensotekprod and sparepart set."));
  }

  if (t === "ensotekprod" && !it.ensotekprod) {
    return next(new Error("Offer item requires 'ensotekprod' when productType is 'ensotekprod'."));
  }
  if (t === "sparepart" && !it.sparepart) {
    return next(new Error("Offer item requires 'sparepart' when productType is 'sparepart'."));
  }
  next();
});

const RevisionSchema = new Schema(
  {
    pdfUrl:    { type: String, required: true, trim: true },
    updatedAt: { type: Date, default: Date.now },
    by:        { type: Schema.Types.ObjectId, ref: "user" },
    note:      { type: String, trim: true },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema(
  {
    status: { type: String, required: true, trim: true },
    at:     { type: Date, default: Date.now },
    by:     { type: Schema.Types.ObjectId, ref: "user" },
    note:   { type: String, trim: true },
  },
  { _id: false }
);

const OfferSchema = new Schema<IOffer>(
  {
    tenant:      { type: String, required: true, index: true },
    offerNumber: { type: String, required: true },

    source: { type: String, enum: ["internal", "publicForm", "import"], default: "internal", index: true },
    rfqId:  { type: Schema.Types.ObjectId, ref: "rfq", default: null },

    user:        { type: Schema.Types.ObjectId, ref: "user", default: null },
    company:     { type: Schema.Types.ObjectId, ref: "company", default: null },
    customer:    { type: Schema.Types.ObjectId, ref: "customer", default: null },
    contactPerson: { type: String, trim: true },

    items: { type: [OfferItemSchema], required: true },

    shippingCost:   { type: Number, default: 0 },
    additionalFees: { type: Number, default: 0 },
    discount:       { type: Number, default: 0, min: 0 },

    currency:      { type: String, required: true, default: "EUR" },
    paymentTerms:  { type: Object, required: true, default: () => multilangDefault() },
    notes:         { type: Object, default: () => multilangDefault() },

    validUntil: { type: Date, required: true },

    status: {
      type: String,
      enum: ["draft", "preparing", "sent", "pending", "approved", "rejected"],
      default: "draft",
      index: true,
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },

    totalNet:   { type: Number, required: true, min: 0 },
    totalVat:   { type: Number, required: true, min: 0 },
    totalGross: { type: Number, required: true, min: 0 },

    pdfUrl:         { type: String, default: "" },
    revisionHistory:{ type: [RevisionSchema], default: [] },

    email: {
      to:      { type: String, trim: true, lowercase: true },
      cc:      [{ type: String, trim: true, lowercase: true }],
      bcc:     [{ type: String, trim: true, lowercase: true }],
      subject: { type: Object, default: () => multilangDefault() },
      body:    { type: Object, default: () => multilangDefault() },
      lastEmailError: { type: String, default: null },
    },
    sentByEmail: { type: Boolean, default: false },
    sentAt:      { type: Date },
    acceptedAt:  { type: Date },
    declinedAt:  { type: Date },

    acceptTokenHash: { type: String, default: null },

    attachments: [{ url: String, name: String, mime: String, size: Number }],

    createdBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
  },
  { timestamps: true }
);

// --- Index’ler ---
OfferSchema.index({ tenant: 1, offerNumber: 1 }, { unique: true });
OfferSchema.index({ tenant: 1, status: 1, createdAt: -1 });

// --- TOPLAM HESAP ---
function round2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }
export function recalcTotals(doc: any) {
  let sumNet = 0, sumVat = 0;
  (doc.items || []).forEach((it: any) => {
    const price = (typeof it.customPrice === "number" ? it.customPrice : it.unitPrice) || 0;
    const qty   = Number(it.quantity || 0);
    const vat   = Number(it.vat || 0);
    const lineNet = round2(price * qty);
    const lineVat = round2(lineNet * (vat / 100));
    it.total = round2(lineNet + lineVat);
    sumNet += lineNet;
    sumVat += lineVat;
  });
  sumNet = round2(sumNet);
  sumVat = round2(sumVat);
  const extras = round2((doc.shippingCost || 0) + (doc.additionalFees || 0) - (doc.discount || 0));
  const gross  = round2(sumNet + sumVat + extras);
  doc.totalNet   = sumNet;
  doc.totalVat   = sumVat;
  doc.totalGross = gross < 0 ? 0 : gross;
}

// Instance & Static
OfferSchema.methods.recalcTotals = function () { recalcTotals(this); };

export interface OfferDoc extends HydratedDocument<IOffer> {
  recalcTotals(): void;
}
export interface OfferModel extends Model<IOffer> {
  recalcTotals(doc: OfferDoc): void;
}
OfferSchema.statics.recalcTotals = recalcTotals;

// Otomatik hesap
OfferSchema.pre("validate", function (next) {
  recalcTotals(this);
  next();
});

export const Offer: Model<IOffer> =
  models.offer || model<IOffer>("offer", OfferSchema);
