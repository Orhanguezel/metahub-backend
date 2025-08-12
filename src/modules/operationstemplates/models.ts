import { Schema, model, models, type Model } from "mongoose";
import type { IOperationTemplate } from "./types";

/* i18n helper */
const localizedStringField = () => ({ type: Object, default: {} });

/* --- Alt şemalar --- */
const CrewSchema = new Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    recommended: { type: Number, min: 0 },
  },
  { _id: false }
);

const ChecklistItemSchema = new Schema(
  {
    text: localizedStringField(),
    required: { type: Boolean, default: false },
    photoRequired: { type: Boolean, default: false },
    minPhotos: { type: Number, min: 0, default: 0 },
    geoCheck: { type: Boolean, default: false },
  },
  { _id: false }
);

const QualityCheckSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: localizedStringField(),
    type: { type: String, enum: ["boolean", "number", "select"], default: "boolean" },
    passIf: { type: Schema.Types.Mixed },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const StepSchema = new Schema(
  {
    code: { type: String, trim: true },
    title: localizedStringField(),
    instruction: localizedStringField(),
    type: { type: String, enum: ["task", "inspection", "safety", "handover"], default: "task" },
    estimatedMinutes: { type: Number, min: 0 },
    requiredSkills: { type: [String], default: [] },
    requiredEquipment: { type: [String], default: [] },
    checklist: { type: [ChecklistItemSchema], default: [] },
    quality: { type: [QualityCheckSchema], default: [] },
  },
  { _id: false }
);

const MaterialRequirementSchema = new Schema(
  {
    itemRef: { type: Schema.Types.ObjectId, ref: "inventoryitem" },
    sku: String,
    name: localizedStringField(),
    quantity: { type: Number, min: 0 },
    unit: String,
    chargeTo: { type: String, enum: ["expense", "customer", "internal"], default: "expense" },
  },
  { _id: false }
);

const DeliverablesSchema = new Schema(
  {
    photos: {
      before: { type: Boolean, default: false },
      after: { type: Boolean, default: false },
      minPerStep: { type: Number, min: 0, default: 0 },
    },
    signatures: {
      customer: { type: Boolean, default: false },
      supervisor: { type: Boolean, default: false },
    },
    notesRequired: { type: Boolean, default: false },
    attachmentsRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const RecurrenceSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    every: { type: Number, min: 1, default: 1 },
    unit: { type: String, enum: ["day", "week", "month"] },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    dayOfMonth: { type: Number, min: 1, max: 31 },
    nthWeekday: {
      nth: { type: Number, min: 1, max: 5 },
      weekday: { type: Number, min: 0, max: 6 },
    },
    startDateHint: { type: Date },
  },
  { _id: false }
);

const ApplicabilitySchema = new Schema(
  {
    categoryRefs: [{ type: Schema.Types.ObjectId, ref: "apartmentcategory" }],
    apartmentRefs: [{ type: Schema.Types.ObjectId, ref: "apartment" }],
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

/* --- Ana şema --- */
const OperationTemplateSchema = new Schema<IOperationTemplate>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, index: true }, // tenant+code unique
    name: localizedStringField(),
    description: localizedStringField(),

    serviceRef: { type: Schema.Types.ObjectId, ref: "servicecatalog" },
    defaultDurationMinutes: { type: Number, min: 0 },
    crew: { type: CrewSchema },

    steps: { type: [StepSchema], default: [] },
    materials: { type: [MaterialRequirementSchema], default: [] },
    safetyNotes: { type: [Object], default: [] }, // TranslatedLabel[]

    deliverables: { type: DeliverablesSchema },
    recurrence: { type: RecurrenceSchema },
    applicability: { type: ApplicabilitySchema },

    tags: { type: [String], default: [] },
    version: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
    deprecatedAt: { type: Date },
  },
  { timestamps: true }
);

/* Indexler */
OperationTemplateSchema.index({ tenant: 1, code: 1 }, { unique: true });
OperationTemplateSchema.index({ tenant: 1, serviceRef: 1, isActive: 1 });
OperationTemplateSchema.index({ tenant: 1, "applicability.categoryRefs": 1 });
OperationTemplateSchema.index({ tenant: 1, tags: 1, isActive: 1 });

/* Basit kod üretimi (ileride numaratör servisine taşınabilir) */
OperationTemplateSchema.pre("validate", function (next) {
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `OPT-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

export const OperationTemplate: Model<IOperationTemplate> =
  models.operationtemplate || model<IOperationTemplate>("operationtemplate", OperationTemplateSchema);
