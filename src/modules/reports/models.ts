// src/modules/reports/model.ts
import { Schema, model, models, type Model } from "mongoose";
import type { IReportDefinition, IReportRun } from "./types";

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

const ReportScheduleSchema = new Schema(
  {
    isEnabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ["daily","weekly","monthly","quarterly","yearly","cron"],
      default: "monthly",
    },
    timezone: String,
    timeOfDay: String,
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    cron: String,
    lastRunAt: Date,
    nextRunAt: Date,
    recipients: [{
      channel: { type: String, enum: ["email","webhook"], required: true },
      target:  { type: String, required: true },
      format:  { type: String, enum: ["csv","xlsx","pdf","json"], default: "csv" },
      _id: false,
    }],
  },
  { _id: false }
);

/* ---------- Definition ---------- */
const ReportDefinitionSchema = new Schema<IReportDefinition>(
  {
    tenant: { type: String, required: true, index: true },
    code:   { type: String, index: true },

    name:   { type: String, required: true, trim: true },
    kind:   {
      type: String,
      enum: [
        "ar_aging","ap_aging","revenue","expense","cashflow",
        "profitability","billing_forecast","invoice_collections",
        "employee_utilization","workload","service_performance",
      ],
      required: true,
      index: true,
    },
    description: String,

    // esnek alanlar için Mixed kullanmak TS tarafında daha güvenli
    defaultFilters: { type: Schema.Types.Mixed },

    // görünüm alanı da esnek: Mixed + default
    view: {
      type: Schema.Types.Mixed,
      default: { type: "table" },
    },

    exportFormats: {
      type: [String],
      enum: ["csv","xlsx","pdf","json"],
      default: ["csv","xlsx"],
    },

    schedule: { type: ReportScheduleSchema },
    isActive: { type: Boolean, default: true, index: true },
    tags: [String],

    createdByRef: { type: Schema.Types.ObjectId, ref: "user" },
    updatedByRef: { type: Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

/* ---------- Run ---------- */
const ReportRunSchema = new Schema<IReportRun>(
  {
    tenant: { type: String, required: true, index: true },
    definitionRef: { type: Schema.Types.ObjectId, ref: "reportdefinition", index: true },
    kind: {
      type: String,
      enum: [
        "ar_aging","ap_aging","revenue","expense","cashflow",
        "profitability","billing_forecast","invoice_collections",
        "employee_utilization","workload","service_performance",
      ],
      required: true,
      index: true,
    },
    code: { type: String, index: true },
    triggeredBy: { type: String, enum: ["manual","schedule","api"], default: "manual" },

    startedAt: Date,
    finishedAt: Date,
    status: {
      type: String,
      enum: ["queued","running","success","error","cancelled"],
      default: "queued",
      index: true,
    },
    durationMs: Number,

    // esnek filtre snapshot
    filtersUsed: { type: Schema.Types.Mixed },

    rowCount: Number,
    bytes: Number,
    files: { type: [FileAssetSchema], default: [] },

    // ⛳️ fix: Array yerine [Schema.Types.Mixed]
    previewSample: { type: Schema.Types.Mixed, default: [] },

    error: String,
  },
  { timestamps: true }
);

/* ---------- Indexes ---------- */
ReportDefinitionSchema.index({ tenant: 1, code: 1 }, { unique: false });
ReportDefinitionSchema.index({ tenant: 1, kind: 1, isActive: 1 });

ReportRunSchema.index({ tenant: 1, kind: 1, status: 1, startedAt: -1 });
ReportRunSchema.index({ tenant: 1, definitionRef: 1, startedAt: -1 });

/* ---------- Generators ---------- */
ReportDefinitionSchema.pre("validate", function(next) {
  const self = this as any;
  if (!self.code) {
    const y = new Date().getFullYear();
    self.code = `REP-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

ReportRunSchema.pre("validate", function(next) {
  const self = this as any;
  if (!self.code) {
    const y = new Date().getFullYear();
    self.code = `RUN-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

export const ReportDefinition: Model<IReportDefinition> =
  models.reportdefinition || model<IReportDefinition>("reportdefinition", ReportDefinitionSchema);

export const ReportRun: Model<IReportRun> =
  models.reportrun || model<IReportRun>("reportrun", ReportRunSchema);
