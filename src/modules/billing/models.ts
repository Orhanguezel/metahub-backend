import { Schema, model, models, type Model, SchemaTypeOptions } from "mongoose";
import type {
  IBillingPlan,
  IBillingOccurrence,
  BillingPlanStatus,
  BillingOccurrenceStatus,
} from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* i18n string alanı */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const l of SUPPORTED_LOCALES) {
    fields[l] = { type: String, trim: true, default: "" };
  }
  return fields;
};

/* --- Sub-schemas --- */
const DueRuleSchema = new Schema(
  {
    type: { type: String, enum: ["dayOfMonth", "nthWeekday"], required: true },
    day: { type: Number, min: 1, max: 31 },      // dayOfMonth
    nth: { type: Number, min: 1, max: 5 },       // nthWeekday
    weekday: { type: Number, min: 0, max: 6 },   // nthWeekday
  },
  { _id: false }
);

const SourceSchema = new Schema(
  {
    contract: { type: Schema.Types.ObjectId, ref: "contract", required: true },
    contractLine: { type: Schema.Types.ObjectId }, // nested subdoc ref key
    mode: { type: String, enum: ["fixed", "perLine"], required: true },
    snapshots: {
      contractCode: { type: String, trim: true },
      apartment: { type: Schema.Types.ObjectId, ref: "apartment" },
      customer: { type: Schema.Types.ObjectId, ref: "customer" },
      service: { type: Schema.Types.ObjectId, ref: "servicecatalog" },
      title: { type: Object }, // TranslatedLabel
    },
  },
  { _id: false }
);

const ScheduleSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "EUR" },
    period: { type: String, enum: ["weekly", "monthly", "quarterly", "yearly"], required: true },
    dueRule: { type: DueRuleSchema, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    graceDays: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

/* --- BillingPlan --- */
const BillingPlanSchema = new Schema<IBillingPlan>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, index: true }, // tenant+code unique

    source: { type: SourceSchema, required: true },
    schedule: { type: ScheduleSchema, required: true },

    status: {
      type: String,
      enum: ["draft", "active", "paused", "ended"] as BillingPlanStatus[],
      default: "draft",
      index: true,
    } satisfies SchemaTypeOptions<BillingPlanStatus>,

    lastRunAt: Date,
    nextDueAt: Date,

    notes: { type: Object }, // TranslatedLabel
    revisions: [
      {
        validFrom: { type: Date, required: true },
        amount: { type: Number, min: 0 },
        currency: { type: String },
        reason: { type: String },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

/* Indexler */
BillingPlanSchema.index({ tenant: 1, code: 1 }, { unique: true });
BillingPlanSchema.index({ tenant: 1, status: 1 });
BillingPlanSchema.index({ tenant: 1, nextDueAt: 1 });       // cron/worker taraması için
BillingPlanSchema.index({ tenant: 1, "source.contract": 1 });
BillingPlanSchema.index({ tenant: 1, "source.snapshots.apartment": 1 });

/* Yardımcı: bir sonraki vade tahmini (basit) */
function computeNextDueAt(now: Date, dueRule: any, period: string) {
  const d = new Date(now);
  d.setHours(9, 0, 0, 0);

  if (period === "weekly" && dueRule?.type === "nthWeekday") {
    const wd = dueRule.weekday ?? 1; // default pazartesi
    const delta = (wd - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + delta);
    return d;
  }

  // monthly/quarterly/yearly — dayOfMonth için basit yaklaşım
  if (dueRule?.type === "dayOfMonth") {
    const monthsToAdd =
      period === "monthly" ? 1 : period === "quarterly" ? 3 : period === "yearly" ? 12 : 1;
    const y = d.getFullYear();
    const m = d.getMonth();
    // aynı ayda gün henüz gelmediyse bu ay; yoksa +k adım
    const thisMonth = new Date(y, m, Math.min(dueRule.day, new Date(y, m + 1, 0).getDate()), 9, 0, 0);
    if (thisMonth > now) return thisMonth;
    const nm = m + monthsToAdd;
    return new Date(
      y + Math.floor(nm / 12),
      nm % 12,
      Math.min(dueRule.day, new Date(y + Math.floor(nm / 12), (nm % 12) + 1, 0).getDate()),
      9,
      0,
      0
    );
  }

  // fallback: +1 ay
  d.setMonth(d.getMonth() + 1);
  return d;
}

BillingPlanSchema.pre("validate", function (next) {
  // code boşsa basit bir kod üret (gerçek senaryoda seq servisine bağlayabilirsin)
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `BP-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

BillingPlanSchema.pre("save", function (next) {
  // aktif plan için nextDueAt yoksa kaba bir hesap yap
  if (this.status === "active" && !this.nextDueAt) {
    try {
      const now = new Date();
      const due = computeNextDueAt(now, (this as any).schedule?.dueRule, (this as any).schedule?.period);
      (this as any).nextDueAt = due;
    } catch { /* no-op */ }
  }
  next();
});

export const BillingPlan: Model<IBillingPlan> =
  models.billingplan || model<IBillingPlan>("billingplan", BillingPlanSchema);

/* --- BillingOccurrence --- */
const BillingOccurrenceSchema = new Schema<IBillingOccurrence>(
  {
    tenant: { type: String, required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: "billingplan", required: true, index: true },
    seq: { type: Number, required: true, min: 1 },

    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    dueAt: { type: Date, required: true, index: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "EUR" },

    status: {
      type: String,
      enum: ["pending", "invoiced", "skipped", "canceled"] as BillingOccurrenceStatus[],
      default: "pending",
      index: true,
    } satisfies SchemaTypeOptions<BillingOccurrenceStatus>,

    invoice: { type: Schema.Types.ObjectId, ref: "invoice" },
    notes: { type: Object }, // TranslatedLabel
  },
  { timestamps: true }
);

/* Indexler */
BillingOccurrenceSchema.index({ tenant: 1, plan: 1, seq: 1 }, { unique: true });
BillingOccurrenceSchema.index({ tenant: 1, status: 1, dueAt: 1 });

export const BillingOccurrence: Model<IBillingOccurrence> =
  models.billingoccurrence || model<IBillingOccurrence>("billingoccurrence", BillingOccurrenceSchema);
