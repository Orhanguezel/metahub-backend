import mongoose, { Schema, Model, models } from "mongoose";
import type { IModuleMeta, IModuleSetting } from "@/modules/admin/types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Dinamik label alanı
const labelSchemaFields = SUPPORTED_LOCALES.reduce((fields, lang) => {
  fields[lang] = { type: String, required: true };
  return fields;
}, {});

// --- ModuleMeta Schema ---
const ModuleMetaSchema = new Schema<IModuleMeta>(
  {
    name: { type: String, required: true, unique: true },
    tenants: [{ type: String, ref: "Tenant", required: true }], // DİZİ!
    label: labelSchemaFields,
    icon: { type: String, default: "box" },
    roles: { type: [String], default: ["admin"] },
    visibleInSidebar: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true },
    useAnalytics: { type: Boolean, default: false },
    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
      default: "en",
    },
    version: { type: String, default: "1.0.0" },
    showInDashboard: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    statsKey: { type: String },
    history: [
      {
        version: { type: String, required: true },
        by: { type: String, required: true },
        date: { type: String, required: true },
        note: { type: String, default: "" },
      },
    ],
    routes: [
      {
        method: { type: String, required: true },
        path: { type: String, required: true },
        auth: { type: Boolean },
        summary: { type: String },
        body: { type: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true }
);

export const ModuleMeta: Model<IModuleMeta> =
  models.ModuleMeta ||
  mongoose.model<IModuleMeta>("ModuleMeta", ModuleMetaSchema);

// --- ModuleSetting Schema ---
const ModuleSettingsSchema = new Schema<IModuleSetting>(
  {
    module: { type: String, required: true },
    tenant: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    visibleInSidebar: { type: Boolean, default: true },
    useAnalytics: { type: Boolean, default: false },
    roles: { type: [String], default: ["admin"] },
    icon: { type: String, default: "box" },
    label: labelSchemaFields,
    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
      default: "en",
    },
  },
  { timestamps: true }
);

export const ModuleSetting: Model<IModuleSetting> =
  models.ModuleSetting ||
  mongoose.model<IModuleSetting>("ModuleSetting", ModuleSettingsSchema);
