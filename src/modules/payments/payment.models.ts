import { Schema, model, models, type Model } from "mongoose";
import type { IPayment } from "./types/payment.types";

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
    currency: { type: String, required: true },
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
    order: { type: Schema.Types.ObjectId, ref: "order" },
  },
  { _id: false }
);

/* --- Payment --- */
const PaymentSchema = new Schema<IPayment>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true },
    kind: {
      type: String,
      enum: ["payment", "refund", "chargeback"],
      default: "payment",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "partially_allocated",
        "allocated",
        "failed",
        "canceled",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    method: {
      type: String,
      enum: ["cash", "bank_transfer", "sepa", "ach", "card", "wallet", "check", "other"],
      required: true,
    },
    provider: { type: String },
    providerRef: { type: String, index: true },
    reference: { type: String },

    grossAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    fxRate: { type: Number, min: 0 },
    fees: { type: [FeeSchema], default: [] },
    feeTotal: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, min: 0, default: 0 },

    receivedAt: { type: Date, required: true },
    bookedAt: { type: Date },

    payer: { type: PayerSchema },
    instrument: { type: InstrumentSchema },

    links: { type: LinksSchema },

    allocations: { type: [AllocationSchema], default: [] },
    allocatedTotal: { type: Number, min: 0, default: 0 },
    unappliedAmount: { type: Number, min: 0, default: 0 },

    metadata: { type: Schema.Types.Mixed },

    reconciled: { type: Boolean, default: false },
    reconciledAt: { type: Date },
    statementRef: { type: String },
  },
  { timestamps: true }
);

/* Indexler */
PaymentSchema.index({ tenant: 1, "links.order": 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, code: 1 }, { unique: true });
PaymentSchema.index({ tenant: 1, status: 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, "links.customer": 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, "links.apartment": 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, "allocations.invoice": 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, reconciled: 1, receivedAt: 1 });
PaymentSchema.index({ tenant: 1, provider: 1, providerRef: 1 });
// Idempotency için önerilen benzersiz index (gateway tekrar çağrılarında):
PaymentSchema.index(
  { tenant: 1, provider: 1, providerRef: 1, kind: 1 },
  { unique: true, sparse: true }
);

/* Normalize + Basit kod üretimi */
PaymentSchema.pre("validate", function (next) {
  // currency upper-case
  if ((this as any).currency) {
    (this as any).currency = String((this as any).currency).toUpperCase();
  }

  if (!this.code) {
    const y = new Date(this.receivedAt ?? Date.now()).getFullYear();
    (this as any).code = `PMT-${y}-${String(Date.now()).slice(-6)}`;
  }

  if (Array.isArray((this as any).fees)) {
    for (const f of (this as any).fees) {
      if (!f.currency) f.currency = (this as any).currency;
      else f.currency = String(f.currency).toUpperCase();
    }
  }

  next();
});

/* Snapshot türetme */
PaymentSchema.pre("save", async function (next) {
  const fees = (this as any).fees || [];
  const feeTotal = fees.reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0);
  (this as any).feeTotal = Math.max(0, feeTotal);

  const net = Math.max(0, (this as any).grossAmount - (this as any).feeTotal);
  (this as any).netAmount = net;

  const allocations = (this as any).allocations || [];
  const allocatedTotal = allocations.reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
  (this as any).allocatedTotal = Math.max(0, allocatedTotal);

  const unapplied = Math.max(0, net - (this as any).allocatedTotal);
  (this as any).unappliedAmount = unapplied;

  // Guard
  if ((this as any).allocatedTotal > net) {
    return next(new Error("payment_allocation_exceeds_net_amount"));
  }

  // Durum türetimi (yalın)
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
  invoice: any;
  amount: number;
  note?: string;
  appliedAt?: Date;
  invoiceCode?: string;
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

/* JSON çıktısı sadeleştirme */
PaymentSchema.set("toJSON", { versionKey: false });
PaymentSchema.set("toObject", { versionKey: false });

export const Payment: Model<IPayment> =
  (models.payment as Model<IPayment>) || model<IPayment>("payment", PaymentSchema);
