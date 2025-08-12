import { Schema, model, models, type Model } from "mongoose";
import type { ITimeEntry } from "./types";

/* ---- Alt şemalar ---- */
const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], index: "2dsphere" }, // [lng, lat]
  },
  { _id: false }
);

const DeviceSchema = new Schema(
  {
    kind: { type: String, enum: ["web", "mobile", "kiosk", "api"] },
    deviceId: String,
    platform: String,
    appVersion: String,
    userAgent: String,
  },
  { _id: false }
);

const BreakSchema = new Schema(
  {
    start: { type: Date },
    end: { type: Date },
    paid: { type: Boolean, default: false },
    reason: String,
    minutes: { type: Number, min: 0 },
  },
  { _id: false }
);

const ApprovalSchema = new Schema(
  {
    status: { type: String, enum: ["pending", "approved", "rejected"], required: true, default: "pending" },
    approverRef: { type: Schema.Types.ObjectId, ref: "user" },
    note: String,
    at: Date,
    stage: { type: String, enum: ["supervisor", "payroll", "custom"], default: "supervisor" },
  },
  { _id: false }
);

const RoundingSchema = new Schema(
  {
    roundToMinutes: { type: Number, min: 1 },
    strategy: { type: String, enum: ["nearest", "up", "down"], default: "nearest" },
    applyTo: { type: String, enum: ["total"], default: "total" },
  },
  { _id: false }
);

const PayCodeSchema = new Schema(
  {
    kind: { type: String, enum: ["regular", "overtime", "holiday", "sick", "vacation", "other"], required: true, default: "regular" },
    billable: { type: Boolean, default: true },
  },
  { _id: false }
);

/* ---- Ana şema ---- */
const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, index: true },

    employeeRef: { type: Schema.Types.ObjectId, ref: "employee", required: true, index: true },
    jobRef: { type: Schema.Types.ObjectId, ref: "operationsjob", index: true },
    shiftRef: { type: Schema.Types.ObjectId, ref: "scheduling.shift", index: true },
    serviceRef: { type: Schema.Types.ObjectId, ref: "servicecatalog", index: true },
    apartmentRef: { type: Schema.Types.ObjectId, ref: "apartment", index: true },

    date: { type: Date, required: true, index: true },
    clockInAt: { type: Date },
    clockOutAt: { type: Date },

    geoIn: { type: GeoPointSchema },
    geoOut: { type: GeoPointSchema },
    deviceIn: { type: DeviceSchema },
    deviceOut: { type: DeviceSchema },

    breaks: { type: [BreakSchema], default: [] },
    notes: { type: String },

    payCode: { type: PayCodeSchema, default: { kind: "regular", billable: true } },
    rounding: { type: RoundingSchema },

    costRateSnapshot: { type: Number, min: 0 },
    billRateSnapshot: { type: Number, min: 0 },

    minutesWorked: { type: Number, min: 0 },
    minutesBreaks: { type: Number, min: 0 },
    minutesPaid: { type: Number, min: 0 },
    overtimeMinutes: { type: Number, min: 0 },

    costAmount: { type: Number, min: 0 },
    billAmount: { type: Number, min: 0 },

    status: {
      type: String,
      enum: ["open", "submitted", "approved", "rejected", "locked", "exported"],
      default: "open",
      index: true,
    },
    approvals: { type: [ApprovalSchema], default: [] },

    exportBatchId: { type: String, index: true },
    source: { type: String, enum: ["manual", "mobile", "kiosk", "import", "system"], default: "manual" },
  },
  { timestamps: true }
);

/* ---- Indexler ---- */
TimeEntrySchema.index({ tenant: 1, employeeRef: 1, date: 1 });
TimeEntrySchema.index({ tenant: 1, jobRef: 1, date: 1 });
TimeEntrySchema.index({ tenant: 1, status: 1, date: 1 });
TimeEntrySchema.index({ tenant: 1, clockInAt: 1 });
TimeEntrySchema.index({ tenant: 1, exportBatchId: 1 });

/* ---- Yardımcılar ---- */
function diffMinutes(a?: Date, b?: Date): number {
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  return ms > 0 ? Math.floor(ms / 60000) : 0;
}
function roundValue(mins: number, rule?: { roundToMinutes?: number; strategy?: "nearest" | "up" | "down" }): number {
  if (!rule?.roundToMinutes || rule.roundToMinutes <= 1) return mins;
  const q = rule.roundToMinutes;
  const r = mins % q;
  if (r === 0) return mins;
  if (rule.strategy === "down") return mins - r;
  if (rule.strategy === "up") return mins + (q - r);
  // nearest
  return r >= q / 2 ? mins + (q - r) : mins - r;
}

/* ---- Hooks ---- */
TimeEntrySchema.pre("validate", function (next) {
  // code üret
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `TE-${y}-${String(Date.now()).slice(-6)}`;
  }
  // clockOut >= clockIn kuralı
  if (this.clockInAt && this.clockOutAt && this.clockOutAt < this.clockInAt) {
    return next(new Error("clockOutAt cannot be earlier than clockInAt"));
  }
  next();
});

TimeEntrySchema.pre("save", function (next) {
  try {
    // "open" kayıtlarda hesap yapma (çıkış yok)
    if (!this.clockInAt || !this.clockOutAt) {
      this.minutesWorked = undefined;
      this.minutesBreaks = undefined;
      this.minutesPaid = undefined;
      this.costAmount = undefined;
      this.billAmount = undefined;
      return next();
    }

    // toplam mola dk
    let breakTotal = 0;
    let paidBreakTotal = 0;
    for (const br of this.breaks || []) {
      let m = 0;
      if (typeof br.minutes === "number") {
        m = Math.max(0, Math.floor(br.minutes));
      } else if (br.start && br.end) {
        m = diffMinutes(br.start, br.end);
      }
      breakTotal += m;
      if (br.paid) paidBreakTotal += m;
    }

    // ham çalışma dk
    let worked = diffMinutes(this.clockInAt, this.clockOutAt);
    // ücretlendirilmeyen molaları çıkar
    const unpaidBreaks = Math.max(0, breakTotal - paidBreakTotal);
    worked = Math.max(0, worked - unpaidBreaks);

    // yuvarlama (toplam)
    worked = roundValue(worked, this.rounding || undefined);

    this.minutesBreaks = breakTotal;
    this.minutesWorked = worked;
    this.minutesPaid = Math.max(0, worked + paidBreakTotal);

    // tutarlar
    if (typeof this.costRateSnapshot === "number") {
      this.costAmount = +((this.costRateSnapshot * (this.minutesPaid || 0)) / 60).toFixed(2);
    }
    if (this.payCode?.billable !== false && typeof this.billRateSnapshot === "number") {
      this.billAmount = +((this.billRateSnapshot * (this.minutesPaid || 0)) / 60).toFixed(2);
    } else {
      this.billAmount = 0;
    }
  } catch (e) {
    return next(e as any);
  }
  next();
});

export const TimeEntry: Model<ITimeEntry> =
  models.timeentry || model<ITimeEntry>("timeentry", TimeEntrySchema);
