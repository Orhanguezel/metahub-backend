import mongoose, { Schema, Model, models } from "mongoose";
import type { IModuleMeta, IModuleSetting } from "@/modules/modules/types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Çoklu dil alanı şeması
const labelSchemaFields = SUPPORTED_LOCALES.reduce((fields, lang) => {
  fields[lang] = { type: String, required: true };
  return fields;
}, {});

// Çoklu dil SEO şeması
const seoFieldSchema = SUPPORTED_LOCALES.reduce((fields, lang) => {
  fields[lang] = { type: String, default: "" };
  return fields;
}, {});

// --- 1️⃣ Tenant-aware ModuleMeta ---
const ModuleMetaSchema = new Schema<IModuleMeta>(
  {
    tenant: { type: String, required: true, index: true },
    name: { type: String, required: true },
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
        version: { type: String, required: true },
        by: { type: String, required: true },
        date: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    routes: [
      {
        method: { type: String, required: true },
        path: { type: String, required: true },
        auth: { type: Boolean, default: false },
        summary: { type: String },
        body: { type: Object },
      },
    ],
  },
  { timestamps: true }
);
// UNIQUE: tenant+name birlikte unique!
ModuleMetaSchema.index({ name: 1, tenant: 1 }, { unique: true });

export const ModuleMeta: Model<IModuleMeta> =
  models.modulemeta || mongoose.model<IModuleMeta>("modulemeta", ModuleMetaSchema);

// --- 2️⃣ ModuleSetting (SEO+Override+Tenant aware) ---
const ModuleSettingSchema = new Schema<IModuleSetting>(
  {
    module: { type: String, required: true, index: true },
    tenant: { type: String, required: true, index: true },
    enabled: { type: Boolean },
    visibleInSidebar: { type: Boolean },
    useAnalytics: { type: Boolean },
    showInDashboard: { type: Boolean },
    roles: { type: [String] },
    order: { type: Number },
    // --- SEO override alanları (çoklu dil) ---
    seoTitle: { type: seoFieldSchema, default: () => ({}) },
    seoDescription: { type: seoFieldSchema, default: () => ({}) },
    seoSummary: { type: seoFieldSchema, default: () => ({}) },
    seoOgImage: { type: String, default: "" },
  },
  { timestamps: true }
);
// UNIQUE: tenant+module birlikte unique!
ModuleSettingSchema.index({ module: 1, tenant: 1 }, { unique: true });

export const ModuleSetting: Model<IModuleSetting> =
  models.modulesetting || mongoose.model<IModuleSetting>("modulesetting", ModuleSettingSchema);
