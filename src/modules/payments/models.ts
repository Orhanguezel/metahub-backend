// src/modules/payments/models.ts
import { Schema, model, models, type Model } from "mongoose";
import type { IPayment } from "./types";

/* --- Alt şemalar --- */
const PayerSchema = new Schema(
  {
    name: String,
    taxId: String,
    email: String,
    phone: String,
    addressLine: String,
  },
  { _id: false }
);

const InstrumentSchema = new Schema(
  {
    type: { type: String, enum: ["card", "bank", "cash", "wallet", "other"] },
    brand: String,
    last4: String,
    iban: String,
    accountNoMasked: String,
  },
  { _id: false }
);

const FeeSchema = new Schema(
  {
    type: { type: String, enum: ["gateway", "bank", "manual"], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true }, // default'u pre-validate'de payment.currency'ye set'liyoruz
    note: String,
  },
  { _id: false }
);

const AllocationSchema = new Schema(
  {
    invoice: { type: Schema.Types.ObjectId, ref: "invoice", required: true },
    invoiceCode: String,
    amount: { type: Number, required: true, min: 0 },
    appliedAt: Date,
    note: String,
  },
  { _id: false }
);

const LinksSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "customer" },
    apartment: { type: Schema.Types.ObjectId, ref: "apartment" },
    contract: { type: Schema.Types.ObjectId, ref: "contract" },
  },
  { _id: false }
);

/* --- Payment --- */
const PaymentSchema = new Schema<IPayment>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true }, // tenant+code unique
    kind: { type: String, enum: ["payment", "refund", "chargeback"], default: "payment", index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "partially_allocated", "allocated", "failed", "canceled"],
      default: "pending",
      index: true,
    },

    method: {
      type: String,
      enum: ["cash", "bank_transfer", "sepa", "ach", "card", "wallet", "check", "other"],
      required: true,
    },
    provider: String,
    providerRef: String,
    reference: String,

    grossAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true }, // "EUR","TRY"… (opsiyonel kontrolü üst katmanda yapın)
    fxRate: { type: Number, min: 0 },
    fees: { type: [FeeSchema], default: [] },
    feeTotal: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, min: 0, default: 0 },

    receivedAt: { type: Date, required: true },
    bookedAt: Date,

    payer: { type: PayerSchema },
    instrument: { type: InstrumentSchema },

    links: { type: LinksSchema },

    allocations: { type: [AllocationSchema], default: [] },
    allocatedTotal: { type: Number, min: 0, default: 0 },
    unappliedAmount: { type: Number, min: 0, default: 0 },

    metadata: { type: Schema.Types.Mixed },

    reconciled: { type: Boolean, default: false },
    reconciledAt: Date,
    statementRef: String,
  },
  { timestamps: true }
);

/* Indexler */
PaymentSchema.index({ tenant: 1, code: 1 }, { unique: true });
PaymentSchema.index({ tenant: 1, status: 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, "links.customer": 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, "links.apartment": 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, "allocations.invoice": 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, reconciled: 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, provider: 1, providerRef: 1 }); // gateway id ile hızlı lookup
PaymentSchema.index({ tenant: 1, statementRef: 1 });              // ekstre eşleşmeleri

/* Basit kod üretimi (gerçekte numaratör servisi kullanılacak) */
PaymentSchema.pre("validate", function (next) {
  // code yoksa üret
  if (!this.code) {
    const y = new Date(this.receivedAt ?? Date.now()).getFullYear();
    (this as any).code = `PMT-${y}-${String(Date.now()).slice(-6)}`;
  }
  // fees.currency boşsa payment.currency'yi miras al
  if (Array.isArray((this as any).fees)) {
    for (const f of (this as any).fees) {
      if (!f.currency) f.currency = (this as any).currency;
    }
  }
  next();
});

/* Snapshot alanları + durum türetmesi */
PaymentSchema.pre("save", async function (next) {
  const fees = (this as any).fees || [];
  const feeTotal = fees.reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0);
  (this as any).feeTotal = Math.max(0, feeTotal);

  const net = Math.max(0, (this as any).grossAmount - (this as any).feeTotal);
  (this as any).netAmount = net;

  const allocations = (this as any).allocations || [];
  const allocatedTotal = allocations.reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
  (this as any).allocatedTotal = Math.max(0, allocatedTotal);

  // invoiceCode snapshot boş olan allocation'lar için invoice.code doldur (opsiyonel, hızlı sorgu için)
  const missing = allocations.filter((a: any) => a.invoice && !a.invoiceCode).map((a: any) => a.invoice);
  if (missing.length) {
    try {
      const Invoice = this.model("invoice");
      const map = new Map<string, string>();
      const rows = await Invoice.find({ _id: { $in: missing } }).select("_id code").lean();
      rows.forEach((r: any) => map.set(String(r._id), r.code));
      (this as any).allocations = allocations.map((a: any) =>
        a.invoice && !a.invoiceCode ? { ...a, invoiceCode: map.get(String(a.invoice)) } : a
      );
    } catch {
      // sessiz geç (opsiyonel)
    }
  }

  const unapplied = Math.max(0, net - (this as any).allocatedTotal);
  (this as any).unappliedAmount = unapplied;

  // Guard: fazla dağıtım engeli
  if ((this as any).allocatedTotal > net) {
    return next(new Error("payment_allocation_exceeds_net_amount"));
  }

  // Durum türetmesi (yalın): confirmed → (partially_allocated|allocated)
  if (this.status === "confirmed") {
    if (allocatedTotal <= 0) {
      (this as any).status = "confirmed";
    } else if (unapplied > 0) {
      (this as any).status = "partially_allocated";
    } else {
      (this as any).status = "allocated";
    }
  }

  next();
});

/* Virtuals */
PaymentSchema.virtual("isFullyAllocated").get(function (this: any) {
  return Number(this.unappliedAmount || 0) <= 0;
});

/* Methods */
PaymentSchema.methods.allocateToInvoice = function (args: {
  invoice: any; amount: number; note?: string; appliedAt?: Date; invoiceCode?: string;
}) {
  const amount = Number(args.amount || 0);
  if (amount <= 0) throw new Error("invalid_allocation_amount");

  const unapplied = Number(this.unappliedAmount || 0);
  if (amount > unapplied) throw new Error("allocation_exceeds_unapplied");

  (this as any).allocations = [
    ...(this.allocations || []),
    {
      invoice: args.invoice,
      invoiceCode: args.invoiceCode,
      amount,
      note: args.note,
      appliedAt: args.appliedAt || new Date(),
    },
  ];
  return this;
};

PaymentSchema.methods.markReconciled = function (ref?: string) {
  (this as any).reconciled = true;
  (this as any).reconciledAt = new Date();
  if (ref) (this as any).statementRef = ref;
  return this;
};

export const Payment: Model<IPayment> =
  models.payment || model<IPayment>("payment", PaymentSchema);
