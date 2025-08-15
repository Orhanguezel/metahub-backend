import { Schema, model, models, type Model } from "mongoose";
import type { ISchedulePlan } from "./types";

const localized = () => ({ type: Object, default: {} });

/* ---- Alt şemalar ---- */

const AnchorSchema = new Schema(
  {
    apartmentRef: { type: Schema.Types.ObjectId, ref: "apartment", required: true },
    categoryRef: { type: Schema.Types.ObjectId, ref: "neighborhood" },
    serviceRef: { type: Schema.Types.ObjectId, ref: "servicecatalog" },
    templateRef: { type: Schema.Types.ObjectId, ref: "operationtemplate" },
    contractRef: { type: Schema.Types.ObjectId, ref: "contract" },
  },
  { _id: false }
);

const TimeWindowSchema = new Schema(
  {
    startTime: { type: String },      // "HH:mm"
    endTime: { type: String },      // "HH:mm"
    durationMinutes: { type: Number, min: 0 },
  },
  { _id: false }
);

const GenerationPolicySchema = new Schema(
  {
    leadTimeDays: { type: Number, min: 0, default: 3 },
    lockAheadPeriods: { type: Number, min: 0, default: 1 },
    autoAssign: { type: Boolean, default: false },
    preferredEmployees: [{ type: Schema.Types.ObjectId, ref: "employee" }],
    minCrewSize: { type: Number, min: 1 },
    maxCrewSize: { type: Number, min: 1 },
  },
  { _id: false }
);

const BlackoutSchema = new Schema(
  {
    from: { type: Date, required: true },
    to: { type: Date },
    reason: { type: String },
  },
  { _id: false }
);

/** Union: RecurrencePattern */
const PatternSchema = new Schema(
  {
    type: { type: String, enum: ["weekly", "dayOfMonth", "nthWeekday", "yearly"], required: true },
    every: { type: Number, min: 1 },           // weekly/dayOfMonth/nthWeekday
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // weekly
    day: { type: Number, min: 1, max: 31 },  // dayOfMonth, yearly
    nth: { type: Number, min: 1, max: 5 },   // nthWeekday
    weekday: { type: Number, min: 0, max: 6 },   // nthWeekday
    month: { type: Number, min: 1, max: 12 },  // yearly
  },
  { _id: false }
);

/* ---- Ana şema ---- */

const SchedulePlanSchema = new Schema<ISchedulePlan>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, index: true },

    title: localized(),
    description: localized(),

    anchor: { type: AnchorSchema, required: true },
    timezone: { type: String, default: "Europe/Istanbul" },

    pattern: { type: PatternSchema, required: true },
    window: { type: TimeWindowSchema, default: {} },
    policy: { type: GenerationPolicySchema, default: {} },

    startDate: { type: Date, required: true },
    endDate: { type: Date },
    skipDates: { type: [Date], default: [] },
    blackouts: { type: [BlackoutSchema], default: [] },

    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
    lastJobRef: { type: Schema.Types.ObjectId, ref: "operationjob" },

    status: { type: String, enum: ["active", "paused", "archived"], default: "active", index: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

/* ---- Indexler ---- */
SchedulePlanSchema.index({ tenant: 1, code: 1 }, { unique: true });
SchedulePlanSchema.index({ tenant: 1, status: 1, nextRunAt: 1 });
SchedulePlanSchema.index({ tenant: 1, "anchor.apartmentRef": 1, status: 1 });
SchedulePlanSchema.index({ tenant: 1, "anchor.serviceRef": 1, status: 1 });

/* ---- Yardımcılar ---- */

// Basit nextRunAt hesapları (weekly, dayOfMonth, nthWeekday)
function clampDom(y: number, m: number, day: number) {
  const dim = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, dim));
}

function nextForWeekly(from: Date, every: number, days: number[]) {
  // days: 0..6 (Pazar..Cumartesi)
  const base = new Date(from);
  base.setHours(9, 0, 0, 0);

  for (let w = 0; w <= 8; w++) {
    const weekStart = new Date(base);
    weekStart.setDate(weekStart.getDate() + w * 7 * (every || 1));
    for (let d = 0; d < 7; d++) {
      const dt = new Date(weekStart);
      dt.setDate(weekStart.getDate() + d);
      if (days.includes(dt.getDay()) && dt > from) return dt;
    }
  }
  return undefined;
}

function nextForDayOfMonth(from: Date, every: number, day: number) {
  const now = new Date(from);
  let y = now.getFullYear(); let m = now.getMonth();
  // aday = bu ayın 'day'ı; geçmişse 'every' ay ileri
  let cand = clampDom(y, m, day);
  if (cand <= from) {
    m += (every || 1);
    y = y + Math.floor(m / 12);
    m = m % 12;
    cand = clampDom(y, m, day);
  }
  cand.setHours(9, 0, 0, 0);
  return cand;
}

function nthWeekdayOfMonth(y: number, m: number, nth: number, weekday: number) {
  const first = new Date(y, m, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  const dim = new Date(y, m + 1, 0).getDate();
  if (day > dim) return undefined;
  return new Date(y, m, day, 9, 0, 0);
}

function nextForNthWeekday(from: Date, every: number, nth: number, weekday: number) {
  const now = new Date(from);
  let y = now.getFullYear(); let m = now.getMonth();
  let cand = nthWeekdayOfMonth(y, m, nth, weekday);
  if (!cand || cand <= from) {
    m += (every || 1);
    y = y + Math.floor(m / 12);
    m = m % 12;
    cand = nthWeekdayOfMonth(y, m, nth, weekday);
  }
  return cand;
}

function isInBlackout(dt: Date, ranges: any[] = []) {
  return ranges.some(r => {
    const from = new Date(r.from);
    const to = r.to ? new Date(r.to) : from;
    return dt >= from && dt <= to;
  });
}

function applySkipAndBlackouts(dt: Date | undefined, skip: Date[] = [], blackouts: any[] = []) {
  if (!dt) return dt;
  const dateKey = (x: Date) => x.toISOString().slice(0, 10);
  const skipKeys = new Set(skip.map(dateKey));
  let cand = new Date(dt);
  // Eğer skip/blackout’a denk geldiyse bir gün ileri dene (basit strateji)
  while (skipKeys.has(dateKey(cand)) || isInBlackout(cand, blackouts)) {
    cand.setDate(cand.getDate() + 1);
  }
  return cand;
}

/* ---- Hooks ---- */

SchedulePlanSchema.pre("validate", function (next) {
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `SCH-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

SchedulePlanSchema.pre("save", function (next) {
  // nextRunAt boşsa basit kural ile hesapla
  try {
    if (!this.nextRunAt && this.status === "active") {
      const now = new Date();
      const start = this.startDate && this.startDate > now ? this.startDate : now;

      let cand: Date | undefined;
      const p: any = this.pattern || {};

      if (p.type === "weekly") {
        const days = Array.isArray(p.daysOfWeek) && p.daysOfWeek.length ? p.daysOfWeek : [1]; // default Pazartesi
        cand = nextForWeekly(start, p.every || 1, days);
      } else if (p.type === "dayOfMonth") {
        cand = nextForDayOfMonth(start, p.every || 1, p.day || 1);
      } else if (p.type === "nthWeekday") {
        cand = nextForNthWeekday(start, p.every || 1, p.nth || 1, p.weekday ?? 1);
      } else if (p.type === "yearly") {
        const y = now.getFullYear();
        let target = new Date(y, (p.month || 1) - 1, p.day || 1, 9, 0, 0);
        if (target <= now) target = new Date(y + 1, (p.month || 1) - 1, p.day || 1, 9, 0, 0);
        cand = target;
      }

      (this as any).nextRunAt = applySkipAndBlackouts(cand, this.skipDates, this.blackouts);
    }
  } catch { /* no-op */ }

  next();
});

export const SchedulePlan: Model<ISchedulePlan> =
  models.scheduleplan || model<ISchedulePlan>("scheduleplan", SchedulePlanSchema);
