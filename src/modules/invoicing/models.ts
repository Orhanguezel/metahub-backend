import { Schema, model, models, type Model } from "mongoose";
import type { IInvoice } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* i18n helper (gerekirse) */
const localizedStringField = () => {
  const f: Record<string, any> = {};
  for (const l of SUPPORTED_LOCALES) f[l] = { type: String, trim: true, default: "" };
  return f;
};

/* --- Subschemas --- */
const PartySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    taxId: String,
    email: String,
    phone: String,
    addressLine: String,
    contactName: String,
  },
  { _id: false }
);

const DiscountSchema = new Schema(
  {
    type: { type: String, enum: ["rate", "amount"], required: true },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ItemSchema = new Schema(
  {
    kind: { type: String, enum: ["service", "fee", "product", "custom"], required: true },
    ref: { type: Schema.Types.ObjectId },
    name: { type: Object, required: true },
    description: { type: Object },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: DiscountSchema },
    taxRate: { type: Number, min: 0, max: 100 },
    rowSubtotal: { type: Number, min: 0 },
    rowTax: { type: Number, min: 0 },
    rowTotal: { type: Number, min: 0 },

    // NEW
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const TotalsSchema = new Schema(
  {
    currency: { type: String, required: true, default: "EUR" },
    fxRate: { type: Number, min: 0 },

    // NEW (optional)
    itemsGrossTotal: { type: Number, min: 0, default: 0 },

    itemsSubtotal: { type: Number, required: true, min: 0, default: 0 },
    itemsDiscountTotal: { type: Number, required: true, min: 0, default: 0 },
    invoiceDiscountTotal: { type: Number, required: true, min: 0, default: 0 },
    taxTotal: { type: Number, required: true, min: 0, default: 0 },
    rounding: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0, default: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    balance: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const LinksSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "customer" },
    apartment: { type: Schema.Types.ObjectId, ref: "apartment" },
    contract: { type: Schema.Types.ObjectId, ref: "contract" },
    billingPlan: { type: Schema.Types.ObjectId, ref: "billingplan" },
    billingOccurrences: [{ type: Schema.Types.ObjectId, ref: "billingoccurrence" }],

    // legacy/ek linkler
    order: { type: Schema.Types.ObjectId, ref: "order" },
    user: { type: Schema.Types.ObjectId, ref: "user" },
    company: { type: Schema.Types.ObjectId, ref: "company" },
  },
  { _id: false }
);

/* --- Invoice --- */
const InvoiceSchema = new Schema<IInvoice>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, index: true }, // tenant+code unique
    type: { type: String, enum: ["invoice", "creditNote"], default: "invoice", index: true },
    status: {
      type: String,
      enum: ["draft", "issued", "sent", "partially_paid", "paid", "canceled"],
      default: "draft",
      index: true,
    },

    issueDate: { type: Date, required: true },
    dueDate: { type: Date },
    periodStart: { type: Date },
    periodEnd: { type: Date },

    seller: { type: PartySchema, required: true },
    buyer: { type: PartySchema, required: true },

    links: { type: LinksSchema },

    items: { type: [ItemSchema], required: true, default: [] },
    invoiceDiscount: { type: DiscountSchema },
    totals: { type: TotalsSchema, required: true },

    notes: { type: Object }, // TranslatedLabel
    terms: { type: Object }, // TranslatedLabel
    attachments: [{ url: { type: String, required: true }, name: String }],

    sentAt: Date,
    paidAt: Date,

    reverses: { type: Schema.Types.ObjectId, ref: "invoice" },
  },
  { timestamps: true }
);

/* Indexler */
InvoiceSchema.index({ tenant: 1, code: 1 }, { unique: true });
InvoiceSchema.index({ tenant: 1, status: 1, dueDate: 1 });
InvoiceSchema.index({ tenant: 1, "links.customer": 1, issueDate: 1 });
InvoiceSchema.index({ tenant: 1, "links.apartment": 1, issueDate: 1 });
InvoiceSchema.index({ tenant: 1, "links.billingPlan": 1 });
InvoiceSchema.index({ tenant: 1, "links.billingOccurrences": 1 });
InvoiceSchema.index({ tenant: 1, "links.order": 1, issueDate: 1 });
InvoiceSchema.index({ tenant: 1, "links.user": 1, issueDate: 1 });
InvoiceSchema.index({ tenant: 1, "links.company": 1, issueDate: 1 });

/* Otomatik numara (örnek) */
InvoiceSchema.pre("validate", function (next) {
  if (!this.code) {
    const y = new Date(this.issueDate ?? Date.now()).getFullYear();
    const prefix = this.type === "creditNote" ? "CN" : "INV";
    (this as any).code = `${prefix}-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

/* Basit toplam hesap — itemsSubtotal düzeltildi, round helper eklendi */
function calcDiscount(base: number, d?: { type: string; value: number }) {
  if (!d) return 0;
  if (d.type === "rate") return Math.max(0, Math.min(100, d.value)) * base / 100;
  return Math.min(base, Math.max(0, d.value));
}


const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

InvoiceSchema.pre("save", function (next) {
  const items = (this as any).items || [];
  let itemsGross = 0, itemsDisc = 0, itemsSub = 0, taxTotal = 0;

  for (const it of items) {
    const gross = Math.max(0, (it.quantity || 0) * (it.unitPrice || 0));
    const rowDisc = calcDiscount(gross, it.discount);
    const rowSubtotal = Math.max(0, gross - rowDisc);
    const rowTax = Math.max(0, rowSubtotal * ((it.taxRate || 0) / 100));
    const rowTotal = rowSubtotal + rowTax;

    // satır değerlerini (2 ondalık) normalize et
    it.rowSubtotal = r2(rowSubtotal);
    it.rowTax = r2(rowTax);
    it.rowTotal = r2(rowTotal);

    itemsGross += gross;
    itemsDisc += rowDisc;
    itemsSub += rowSubtotal;
    taxTotal += rowTax;
  }

  const invDisc = calcDiscount(itemsSub, (this as any).invoiceDiscount);
  const currency = (this as any).totals?.currency || "EUR";
  const rounding = (this as any).totals?.rounding ?? 0;
  const grand = Math.max(0, itemsSub - invDisc + taxTotal + rounding);

  (this as any).totals = {
    currency,
    fxRate: (this as any).totals?.fxRate,
    // NEW: brüt toplam (satır indirimleri öncesi)
    itemsGrossTotal: r2(itemsGross),

    // FIX: ara toplam = satır indirimi SONRASI (vergiden ÖNCE)
    itemsSubtotal: r2(itemsSub),

    itemsDiscountTotal: r2(itemsDisc),
    invoiceDiscountTotal: r2(invDisc),
    taxTotal: r2(taxTotal),
    rounding: r2(rounding),
    grandTotal: r2(grand),
    amountPaid: r2((this as any).totals?.amountPaid ?? 0),
    balance: 0, // altta set edilecek
  };

  const paid = (this as any).totals.amountPaid || 0;
  (this as any).totals.balance = r2((this as any).totals.grandTotal - paid);

  if (this.type === "creditNote") {
    (this as any).totals.grandTotal = r2(-Math.abs((this as any).totals.grandTotal || 0));
    (this as any).totals.balance = r2((this as any).totals.grandTotal - paid);
  }

  next();
});

export const Invoice: Model<IInvoice> =
  models.invoice || model<IInvoice>("invoice", InvoiceSchema);
