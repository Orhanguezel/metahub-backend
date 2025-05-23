import mongoose, { Schema, Model, models } from "mongoose";

/* ---------------------------------------------
   TYPE EXPORTLARI
----------------------------------------------*/

// RouteMeta tipi
export type RouteMeta = {
  method: string;
  path: string;
  auth?: boolean;
  summary?: string;
  body?: any;
};

// TranslatedLabel tipi
export interface TranslatedLabel {
  tr: string;
  en: string;
  de: string;
}

/* ---------------------------------------------
   MODULE META MODEL
----------------------------------------------*/

export interface IModuleMeta {
  name: string;
  label: TranslatedLabel;
  icon: string;
  roles: string[];
  visibleInSidebar: boolean;
  enabled: boolean;
  useAnalytics: boolean;
  language: "tr" | "en" | "de";
  version: string;
  showInDashboard: boolean;
  order: number;
  statsKey?: string;
  history: {
    version: string;
    by: string;
    date: string;
    note: string;
  }[];
  routes: RouteMeta[];
  createdAt?: Date;
  updatedAt?: Date;
}

const moduleMetaSchema = new Schema<IModuleMeta>(
  {
    name: { type: String, required: true, unique: true },
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    icon: { type: String, default: "box" },
    roles: { type: [String], default: ["admin"] },
    visibleInSidebar: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true },
    useAnalytics: { type: Boolean, default: false },
    language: { type: String, enum: ["tr", "en", "de"], default: "en" },
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
  models.ModuleMeta || mongoose.model<IModuleMeta>("ModuleMeta", moduleMetaSchema);

/* ---------------------------------------------
   MODULE SETTING MODEL
----------------------------------------------*/

export interface IModuleSetting {
  project: string;
  module: string;
  enabled: boolean;
  visibleInSidebar: boolean;
  useAnalytics: boolean;
  roles: string[];
  icon: string;
  label: TranslatedLabel;
  createdAt?: Date;
  updatedAt?: Date;
}

const moduleSettingsSchema = new Schema<IModuleSetting>(
  {
    project: { type: String, required: true },
    module: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    visibleInSidebar: { type: Boolean, default: true },
    useAnalytics: { type: Boolean, default: false },
    roles: { type: [String], default: ["admin"] },
    icon: { type: String, default: "box" },
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const ModuleSetting: Model<IModuleSetting> =
  models.ModuleSetting || mongoose.model<IModuleSetting>("ModuleSetting", moduleSettingsSchema);

