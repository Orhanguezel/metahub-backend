import { Schema, model, models, type Model } from "mongoose";
import type { IOperationJob } from "./types";

const localized = () => ({ type: Object, default: {} });

/* --- Alt şemalar --- */

const JobAssignmentSchema = new Schema(
  {
    employeeRef: { type: Schema.Types.ObjectId, ref: "employee", required: true },
    role: { type: String, enum: ["lead", "member"], default: "member" },
    plannedMinutes: { type: Number, min: 0 },
    actualMinutes: { type: Number, min: 0 },
    timeEntryRefs: [{ type: Schema.Types.ObjectId, ref: "timesheet" }],
  },
  { _id: false }
);

const MaterialUsageSchema = new Schema(
  {
    itemRef: { type: Schema.Types.ObjectId, ref: "inventoryitem" },
    sku: String,
    name: localized(),
    quantity: { type: Number, min: 0 },
    unit: String,
    costPerUnit: { type: Number, min: 0 },
    currency: { type: String, default: "EUR" },
    totalCost: { type: Number, min: 0 },
    chargeTo: { type: String, enum: ["expense", "customer", "internal"], default: "expense" },
  },
  { _id: false }
);

const ChecklistResultSchema = new Schema(
  {
    text: localized(),
    required: { type: Boolean, default: false },
    checked: { type: Boolean, default: false },
    photoUrls: { type: [String], default: [] },
    note: String,
  },
  { _id: false }
);

const QualityResultSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: localized(),
    type: { type: String, enum: ["boolean", "number", "select"], default: "boolean" },
    value: { type: Schema.Types.Mixed },
    pass: { type: Boolean },
  },
  { _id: false }
);

const JobStepResultSchema = new Schema(
  {
    stepCode: String,
    title: localized(),
    instruction: localized(),
    type: { type: String, enum: ["task", "inspection", "safety", "handover"], default: "task" },
    estimatedMinutes: { type: Number, min: 0 },
    actualMinutes: { type: Number, min: 0 },
    checklist: { type: [ChecklistResultSchema], default: [] },
    quality: { type: [QualityResultSchema], default: [] },
    notes: String,
    photos: { type: [String], default: [] },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const DeliverableResultSchema = new Schema(
  {
    photos: {
      before: { type: [String], default: [] },
      after: { type: [String], default: [] },
    },
    signatures: {
      customer: {
        name: String,
        byRef: { type: Schema.Types.ObjectId, ref: "contact" },
        at: Date,
        imageUrl: String,
      },
      supervisor: {
        name: String,
        byRef: { type: Schema.Types.ObjectId, ref: "employee" },
        at: Date,
        imageUrl: String,
      },
    },
    notes: String,
    attachments: [
      {
        url: { type: String, required: true },
        mime: String,
        caption: String,
        _id: false,
      },
    ],
  },
  { _id: false }
);

const JobFinanceSchema = new Schema(
  {
    billable: { type: Boolean, default: true },
    revenueAmountSnapshot: { type: Number, min: 0 },
    revenueCurrency: { type: String, default: "EUR" },
    laborCostSnapshot: { type: Number, min: 0 },
    materialCostSnapshot: { type: Number, min: 0 },
    invoiceRef: { type: Schema.Types.ObjectId, ref: "invoice" },
    invoiceLineId: String,
  },
  { _id: false }
);

const JobScheduleSchema = new Schema(
  {
    plannedStart: Date,
    plannedEnd: Date,
    dueAt: Date,
    startedAt: Date,
    pausedAt: Date,
    resumedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { _id: false }
);

/* --- Ana şema --- */

const OperationJobSchema = new Schema<IOperationJob>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, index: true }, // tenant+code unique
    title: localized(),
    description: localized(),

    source: { type: String, enum: ["manual", "recurrence", "contract", "adhoc"], required: true },

    templateRef: { type: Schema.Types.ObjectId, ref: "operationtemplate" },
    serviceRef: { type: Schema.Types.ObjectId, ref: "servicecatalog" },
    contractRef: { type: Schema.Types.ObjectId, ref: "contract" },

    apartmentRef: { type: Schema.Types.ObjectId, ref: "apartment", required: true },
    categoryRef: { type: Schema.Types.ObjectId, ref: "apartmentcategory" },

    status: {
      type: String,
      enum: ["draft", "scheduled", "in_progress", "paused", "completed", "cancelled"],
      default: "draft",
      index: true,
    },

    schedule: { type: JobScheduleSchema, default: {} },
    expectedDurationMinutes: { type: Number, min: 0 },
    actualDurationMinutes: { type: Number, min: 0 },
    onTime: { type: Boolean },

    assignments: { type: [JobAssignmentSchema], default: [] },
    steps: { type: [JobStepResultSchema], default: [] },
    materials: { type: [MaterialUsageSchema], default: [] },
    deliverables: { type: DeliverableResultSchema },

    finance: { type: JobFinanceSchema },

    priority: { type: String, enum: ["low", "normal", "high", "critical"], default: "normal" },
    tags: { type: [String], default: [] },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* --- Indexler --- */
OperationJobSchema.index({ tenant: 1, code: 1 }, { unique: true });
OperationJobSchema.index({ tenant: 1, apartmentRef: 1, "schedule.plannedStart": 1 });
OperationJobSchema.index({ tenant: 1, "assignments.employeeRef": 1, "schedule.plannedStart": 1 });
OperationJobSchema.index({ tenant: 1, status: 1, priority: 1 });
OperationJobSchema.index({ tenant: 1, "schedule.dueAt": 1 });
OperationJobSchema.index({ tenant: 1, "finance.invoiceRef": 1 });

/* --- Basit otomatik kod --- */
OperationJobSchema.pre("validate", function (next) {
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `JOB-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

/* --- Basit iş kuralları --- */
OperationJobSchema.pre("save", function (next) {
  // plannedStart < plannedEnd
  const s = (this as any).schedule || {};
  if (s.plannedStart && s.plannedEnd && s.plannedStart > s.plannedEnd) {
    return next(new Error("plannedStart must be before plannedEnd"));
  }

  // onTime hesap (dueAt ve completedAt varsa)
  if (s.dueAt && s.completedAt) {
    (this as any).onTime = s.completedAt <= s.dueAt;
  }

  // actualDurationMinutes yoksa steps/assignments'tan türetmeye zemin
  if (!this.actualDurationMinutes && Array.isArray(this.steps)) {
    const sum = this.steps.reduce((acc: number, st: any) => acc + (st.actualMinutes || 0), 0);
    if (sum > 0) (this as any).actualDurationMinutes = sum;
  }

  next();
});

export const OperationJob: Model<IOperationJob> =
  models.operationjob || model<IOperationJob>("operationjob", OperationJobSchema);
