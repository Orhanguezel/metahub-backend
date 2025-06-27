// admin.models.ts
import mongoose, { Schema, Model, models } from "mongoose";
import type { IModuleMeta, IModuleSetting } from "@/modules/modules/types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çoklu dil label alanı (Sadece meta için!)
const labelSchemaFields = SUPPORTED_LOCALES.reduce((fields, lang) => {
  fields[lang] = { type: String, required: true };
  return fields;
}, {});

// ModuleMeta Schema
const ModuleMetaSchema = new Schema<IModuleMeta>(
  {
    name: { type: String, required: true, unique: true },
    label: labelSchemaFields,
    icon: { type: String, default: "box" },
    roles: { type: [String], default: ["admin"] },
    enabled: { type: Boolean, default: true },
    language: { type: String, enum: SUPPORTED_LOCALES, default: "en" },
    version: { type: String, default: "1.0.0" },
    order: { type: Number, default: 0 },
    statsKey: { type: String },
    history: [
      {
        /* ... */
      },
    ],
    routes: [
      {
        /* ... */
      },
    ],
  },
  { timestamps: true }
);

export const ModuleMeta: Model<IModuleMeta> =
  models.ModuleMeta ||
  mongoose.model<IModuleMeta>("ModuleMeta", ModuleMetaSchema);

// ModuleSetting Schema (KISA & TEMİZ!)
const ModuleSettingSchema = new Schema<IModuleSetting>(
  {
    module: { type: String, required: true, index: true }, // FK (ModuleMeta.name)
    tenant: { type: String, required: true, index: true },
    enabled: { type: Boolean },
    visibleInSidebar: { type: Boolean },
    useAnalytics: { type: Boolean },
    showInDashboard: { type: Boolean },
    roles: { type: [String] },
    order: { type: Number },
  },
  { timestamps: true }
);

export const ModuleSetting: Model<IModuleSetting> =
  models.ModuleSetting ||
  mongoose.model<IModuleSetting>("ModuleSetting", ModuleSettingSchema);
