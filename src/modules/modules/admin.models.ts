// src/modules/modules/modules.model.ts
import mongoose, { Schema, Model, models } from "mongoose";
import type { IModuleMeta, IModuleSetting } from "@/modules/modules/types";
import { SUPPORTED_LOCALES } from "@/types/common";

/** localized helpers */
const buildLocalizedRequired = () => {
  const fields: Record<string, any> = {};
  for (const lang of SUPPORTED_LOCALES) {
    fields[lang] = { type: String, required: true, trim: true };
  }
  return fields;
};
const buildLocalizedOptional = () => {
  const fields: Record<string, any> = {};
  for (const lang of SUPPORTED_LOCALES) {
    fields[lang] = { type: String, default: "", trim: true };
  }
  return fields;
};

/** 1) ModuleMeta (tenant-aware) */
const ModuleMetaSchema = new Schema<IModuleMeta>(
  {
    tenant: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    label: buildLocalizedRequired(),
    icon: { type: String, default: "box", trim: true },
    roles: { type: [String], default: ["admin"] },
    enabled: { type: Boolean, default: true },
    language: { type: String, enum: SUPPORTED_LOCALES, default: "en" },
    version: { type: String, default: "1.0.0", trim: true },
    order: { type: Number, default: 0 },
    statsKey: { type: String, trim: true },
    history: [
      {
        version: { type: String, required: true, trim: true },
        by: { type: String, required: true, trim: true },
        date: { type: Date, default: Date.now },
        note: { type: String, trim: true },
      },
    ],
    routes: [
      {
        method: { type: String, required: true, trim: true },
        path: { type: String, required: true, trim: true },
        auth: { type: Boolean, default: false },
        summary: { type: String, trim: true },
        body: { type: Object },
      },
    ],
  },
  { timestamps: true }
);

// UNIQUE: tenant + name
ModuleMetaSchema.index({ tenant: 1, name: 1 }, { unique: true });

export const ModuleMeta: Model<IModuleMeta> =
  models.modulemeta || mongoose.model<IModuleMeta>("modulemeta", ModuleMetaSchema);

/** 2) ModuleSetting (tenant-aware + SEO overrides) */
const ModuleSettingSchema = new Schema<IModuleSetting>(
  {
    module: { type: String, required: true, index: true, trim: true },
    tenant: { type: String, required: true, index: true, trim: true },
    enabled: { type: Boolean },
    visibleInSidebar: { type: Boolean },
    useAnalytics: { type: Boolean },
    showInDashboard: { type: Boolean },
    roles: { type: [String] },
    order: { type: Number },
    seoTitle: { type: buildLocalizedOptional(), default: () => ({}) },
    seoDescription: { type: buildLocalizedOptional(), default: () => ({}) },
    seoSummary: { type: buildLocalizedOptional(), default: () => ({}) },
    seoOgImage: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// UNIQUE: tenant + module
ModuleSettingSchema.index({ tenant: 1, module: 1 }, { unique: true });

export const ModuleSetting: Model<IModuleSetting> =
  models.modulesetting || mongoose.model<IModuleSetting>("modulesetting", ModuleSettingSchema);
