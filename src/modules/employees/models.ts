import { Schema, model, models, type Model } from "mongoose";
import type { IEmployee } from "./types";

const localized = () => ({ type: Object, default: {} });

/* ---- Alt şemalar ---- */

const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], index: "2dsphere" }, // [lng, lat]
  },
  { _id: false }
);

const ContactSchema = new Schema(
  {
    phone: String,
    email: String,
    addressLine: String,
    city: String,
    zip: String,
    country: String, // ISO-2
  },
  { _id: false }
);

const EmergencySchema = new Schema(
  {
    name: { type: String, required: true },
    phone: String,
    relation: String,
  },
  { _id: false }
);

const LanguageSchema = new Schema(
  {
    code: { type: String, required: true },
    level: { type: String, enum: ["basic", "conversational", "fluent", "native"], required: true },
  },
  { _id: false }
);

const SkillSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: localized(),
    level: { type: Number, min: 1, max: 5 },
    serviceRef: { type: Schema.Types.ObjectId, ref: "servicecatalog" },
    expiresAt: Date,
    certified: Boolean,
  },
  { _id: false }
);

const CertificationSchema = new Schema(
  {
    name: { type: String, required: true },
    issuer: String,
    idNumber: String,
    issuedAt: Date,
    expiresAt: Date,
    attachmentRef: { type: Schema.Types.ObjectId, ref: "file" },
  },
  { _id: false }
);

const WeeklyWindowSchema = new Schema(
  {
    weekday: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true }, // "HH:mm"
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const SpecialDayWindowSchema = new Schema(
  {
    date: { type: Date, required: true },
    windows: [{ startTime: String, endTime: String }],
    isUnavailable: { type: Boolean, default: false },
    reason: String,
  },
  { _id: false }
);

const LeaveEntrySchema = new Schema(
  {
    kind: { type: String, enum: ["vacation", "sick", "unpaid", "other"], required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    note: String,
  },
  { _id: false }
);

const ConstraintsSchema = new Schema(
  {
    maxDailyMinutes: { type: Number, min: 0 },
    maxWeeklyMinutes: { type: Number, min: 0 },
    maxMonthlyMinutes: { type: Number, min: 0 },
    minRestHoursBetweenShifts: { type: Number, min: 0 },
    maxConsecutiveDays: { type: Number, min: 0 },
    preferredServices: [{ type: Schema.Types.ObjectId, ref: "servicecatalog" }],
    avoidServices: [{ type: Schema.Types.ObjectId, ref: "servicecatalog" }],
  },
  { _id: false }
);

const RateCardSchema = new Schema(
  {
    kind: { type: String, enum: ["standard", "overtime", "weekend", "holiday", "service"], required: true },
    serviceRef: { type: Schema.Types.ObjectId, ref: "servicecatalog" },
    currency: { type: String, required: true, default: "EUR" },
    payRate: { type: Number, min: 0 },
    billRate: { type: Number, min: 0 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date },
  },
  { _id: false }
);

const EmploymentSchema = new Schema(
  {
    type: { type: String, enum: ["fulltime", "parttime", "contractor", "intern"], required: true },
    position: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    managerRef: { type: Schema.Types.ObjectId, ref: "employee" },
    teamRefs: [{ type: Schema.Types.ObjectId, ref: "team" }],
  },
  { _id: false }
);

/* ---- Ana şema ---- */

const EmployeeSchema = new Schema<IEmployee>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, index: true },
    userRef: { type: Schema.Types.ObjectId, ref: "user" },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true, index: true },
    displayName: String,
    photoUrl: String,

    contact: { type: ContactSchema, default: {} },
    emergency: { type: EmergencySchema },

    languages: { type: [LanguageSchema], default: [] },
    skills: { type: [SkillSchema], default: [] },
    certifications: { type: [CertificationSchema], default: [] },

    employment: { type: EmploymentSchema, required: true },

    homeBase: { type: GeoPointSchema },
    timezone: { type: String, default: "Europe/Istanbul" },

    weeklyAvailability: { type: [WeeklyWindowSchema], default: [] },
    specialDays: { type: [SpecialDayWindowSchema], default: [] },
    leaves: { type: [LeaveEntrySchema], default: [] },
    constraints: { type: ConstraintsSchema, default: {} },

    rateCards: { type: [RateCardSchema], default: [] },
    currentCostPerHour: { type: Number, min: 0 },
    currentBillPerHour: { type: Number, min: 0 },

    status: { type: String, enum: ["active", "inactive", "onleave", "terminated"], default: "active", index: true },
    notes: localized(),
    tags: { type: [String], default: [] },

    nextAvailableAt: { type: Date, index: true },
  },
  { timestamps: true }
);

/* ---- Indexler ---- */
EmployeeSchema.index({ tenant: 1, code: 1 }, { unique: true });
EmployeeSchema.index({ tenant: 1, status: 1, "skills.key": 1 });
EmployeeSchema.index({ tenant: 1, "languages.code": 1 });
EmployeeSchema.index({ tenant: 1, "rateCards.validFrom": 1 });
EmployeeSchema.index({ tenant: 1, fullName: "text" });
// homeBase için 2dsphere index alt şemada zaten tanımlandı

/* ---- Hooks / yardımcılar ---- */
EmployeeSchema.pre("validate", function (next) {
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `EMP-${y}-${String(Date.now()).slice(-6)}`;
  }
  if (!this.fullName && this.firstName && this.lastName) {
    (this as any).fullName = `${this.firstName} ${this.lastName}`.trim();
  }
  next();
});

// İsteğe bağlı: aktif rateCard’lardaki en güncel saatlik değerleri özet alanlara yaz
EmployeeSchema.pre("save", function (next) {
  try {
    const now = new Date();
    const actives = (this as any).rateCards?.filter((r: any) =>
      r.validFrom && r.validFrom <= now && (!r.validTo || r.validTo >= now)
    ) || [];

    const std = actives.find((r: any) => r.kind === "standard");
    if (std) {
      (this as any).currentCostPerHour = std.payRate ?? (this as any).currentCostPerHour;
      (this as any).currentBillPerHour = std.billRate ?? (this as any).currentBillPerHour;
    }
  } catch { /* no-op */ }
  next();
});

export const Employee: Model<IEmployee> =
  models.employee || model<IEmployee>("employee", EmployeeSchema);
