import { Schema, model, models, Model } from "mongoose";
import type { IOffer } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çok dilli alan tipi
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

const OfferItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "product", required: false },
    ensotekprod: { type: Schema.Types.ObjectId, ref: "ensotekprod", required: false },
    productName: { type: Object, required: true, default: () => ({}) },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    customPrice: { type: Number },
    vat: { type: Number, required: true, default: 19 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const RevisionSchema = new Schema(
  {
    pdfUrl: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: "user" },
    note: { type: String },
  },
  { _id: false }
);

const OfferSchema = new Schema(
  {
    tenant: { type: String, required: true, index: true },
    offerNumber: { type: String, unique: true, required: true },
    user: { type: Schema.Types.ObjectId, ref: "user", required: false, default: null },
    company: { type: Schema.Types.ObjectId, ref: "company", required: false, default: null },
    customer: { type: Schema.Types.ObjectId, ref: "customer", required: false, default: null },
    contactPerson: { type: String },
    items: { type: [OfferItemSchema], required: true },
    shippingCost: { type: Number, default: 0 },
    additionalFees: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    currency: { type: String, required: true, default: "EUR" },
    paymentTerms: { type: Object, required: true, default: () => ({ ...localizedStringField() }) },
    notes: { type: Object, default: () => ({ ...localizedStringField() }) },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        "draft",
        "preparing",
        "sent",
        "pending",
        "approved",
        "rejected",
      ],
      default: "draft",
      index: true,
    },
    totalNet: { type: Number, required: true },
    totalVat: { type: Number, required: true },
    totalGross: { type: Number, required: true },
    pdfUrl: { type: String, default: "" },
    sentByEmail: { type: Boolean, default: false },
    sentAt: { type: Date },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
    revisionHistory: { type: [RevisionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "user", required: false, default: null },
  },
  { timestamps: true }
);


// Model guard ile
const Offer: Model<IOffer> = models.offer || model<IOffer>("offer", OfferSchema);
export { Offer };
