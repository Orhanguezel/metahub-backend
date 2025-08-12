import { Schema, model, models, type Model } from "mongoose";
import type { IExpense } from "./types";

/* ---------- Helpers ---------- */
function r2(n?: number | null): number {
  if (!n) return 0;
  return Math.round(n * 100) / 100;
}

/* ---------- Sub Schemas ---------- */
const FileAssetSchema = new Schema(
  {
    url: { type: String, required: true },
    name: String,
    mime: String,
    size: Number,
    publicId: String,
  },
  { _id: false }
);

const ApprovalSchema = new Schema(
  {
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", required: true },
    approverRef: { type: Schema.Types.ObjectId, ref: "user" },
    note: String,
    at: Date,
    stage: { type: String, enum: ["supervisor", "finance", "custom"], default: "supervisor" },
  },
  { _id: false }
);

const TaxBreakdownSchema = new Schema(
  {
    rate: { type: Number, required: true },
    base: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const ExpenseLineSchema = new Schema(
  {
    categoryRef: { type: Schema.Types.ObjectId, ref: "expensecategory" },
    categoryName: String,
    description: String,

    qty: { type: Number, min: 0, default: 1 },
    unitPrice: { type: Number, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    taxRate: { type: Number, min: 0, default: 0 },

    netAmount: { type: Number, min: 0 },
    taxAmount: { type: Number, min: 0 },
    totalAmount: { type: Number, min: 0 },

    apartmentRef: { type: Schema.Types.ObjectId, ref: "apartment" },
    jobRef: { type: Schema.Types.ObjectId, ref: "operationsjob" },
    serviceRef: { type: Schema.Types.ObjectId, ref: "servicecatalog" },
    contractRef: { type: Schema.Types.ObjectId, ref: "contract" },
    tags: [String],
  },
  { _id: false }
);

/* ---------- Main Schema ---------- */
const ExpenseSchema = new Schema<IExpense>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, index: true },

    type: {
      type: String,
      enum: ["vendor_bill", "purchase", "reimbursement", "subscription", "utility", "other"],
      required: true,
      default: "purchase",
      index: true,
    },

    vendorRef: { type: Schema.Types.ObjectId, ref: "contact", index: true },
    employeeRef: { type: Schema.Types.ObjectId, ref: "employee", index: true },
    apartmentRef: { type: Schema.Types.ObjectId, ref: "apartment", index: true },
    jobRef: { type: Schema.Types.ObjectId, ref: "operationsjob", index: true },

    expenseDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, index: true },
    postedAt: { type: Date },

    currency: { type: String, required: true, default: "EUR" },
    baseCurrency: { type: String },
    fxRate: { type: Number, min: 0 }, // 1 currency = fxRate * baseCurrency

    subTotal: { type: Number, min: 0 },
    discountTotal: { type: Number, min: 0 },
    taxTotal: { type: Number, min: 0 },
    grandTotal: { type: Number, min: 0 },
    taxBreakdown: { type: [TaxBreakdownSchema], default: [] },

    paymentRefs: [{ type: Schema.Types.ObjectId, ref: "payment" }],
    paidAmount: { type: Number, min: 0, default: 0 },
    balance: { type: Number, min: 0 },

    reimbursable: { type: Boolean, default: false },
    reimbursementStatus: {
      type: String,
      enum: ["not_required", "pending", "submitted", "approved", "paid"],
      default: "not_required",
      index: true,
    },

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "scheduled", "partially_paid", "paid", "rejected", "void"],
      default: "draft",
      index: true,
    },

    vendorBillNo: String,
    lines: { type: [ExpenseLineSchema], default: [] },
    notes: String,
    internalNote: String,
    attachments: { type: [FileAssetSchema], default: [] },
    approvals: { type: [ApprovalSchema], default: [] },
    tags: [String],
  },
  { timestamps: true }
);

/* ---------- Indexes ---------- */
ExpenseSchema.index({ tenant: 1, expenseDate: 1, status: 1 });
ExpenseSchema.index({ tenant: 1, vendorRef: 1, expenseDate: 1 });
ExpenseSchema.index({ tenant: 1, employeeRef: 1, expenseDate: 1 });
ExpenseSchema.index({ tenant: 1, apartmentRef: 1, expenseDate: 1 });

/* ---------- Code generator ---------- */
ExpenseSchema.pre("validate", function (next) {
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `EX-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

/* ---------- Totals & taxes ---------- */
ExpenseSchema.pre("save", function (next) {
  try {
    // Satır hesapları
    let sub = 0;
    let disc = 0;
    let tax = 0;

    // vergi dökümü oran -> {base,tax}
    const map = new Map<number, { base: number; tax: number }>();

    for (const ln of this.lines || []) {
      const qty = typeof ln.qty === "number" ? ln.qty : 1;
      const unit = r2(ln.unitPrice || 0);
      const dsc = r2(ln.discount || 0);
      const rate = r2(ln.taxRate || 0);

      const net = r2(qty * unit - dsc);
      const tx = r2(net * (rate / 100));
      const tot = r2(net + tx);

      ln.netAmount = net;
      ln.taxAmount = tx;
      ln.totalAmount = tot;

      sub += net;
      disc += dsc;
      tax += tx;

      if (!map.has(rate)) map.set(rate, { base: 0, tax: 0 });
      const agg = map.get(rate)!;
      agg.base = r2(agg.base + net);
      agg.tax = r2(agg.tax + tx);
    }

    this.subTotal = r2(sub);
    this.discountTotal = r2(disc);
    this.taxTotal = r2(tax);
    this.grandTotal = r2(sub + tax);

    this.taxBreakdown = Array.from(map.entries()).map(([rate, v]) => ({
      rate,
      base: v.base,
      tax: v.tax,
      total: r2(v.base + v.tax),
    }));

    // balance güncelle
    const paid = r2(this.paidAmount || 0);
    this.balance = r2(Math.max(0, (this.grandTotal || 0) - paid));
  } catch (e) {
    return next(e as any);
  }
  next();
});

export const Expense: Model<IExpense> =
  models.expense || model<IExpense>("expense", ExpenseSchema);
