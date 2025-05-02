import mongoose, { Schema, Document, Model, models } from "mongoose";

interface TranslatedLabel {
  tr: string;
  en: string;
  de: string;
}

export interface IRouteMeta {
  method: string;
  path: string;
  auth?: boolean;
  summary?: string;
  body?: any;
}

export interface IModuleMeta extends Document {

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
  routes: IRouteMeta[];
  createdAt: Date;
  updatedAt: Date;
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

// ✅ Guard + Model Tipi
const ModuleMeta: Model<IModuleMeta> =
  models.ModuleMeta || mongoose.model<IModuleMeta>("ModuleMeta", moduleMetaSchema);

export default ModuleMeta;

