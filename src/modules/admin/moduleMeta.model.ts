import mongoose, { Schema, Document } from "mongoose";

export interface IModuleMeta extends Document {
  name: string;
  label: {
    tr: string;
    en: string;
    de: string;
  };
  icon: string;
  roles: string[];
  visibleInSidebar: boolean;
  enabled: boolean;
  useAnalytics: boolean;
  routes: {
    method: string;
    path: string;
    auth?: boolean;
    summary?: string;
    body?: any;
  }[];
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

export default mongoose.model<IModuleMeta>("ModuleMeta", moduleMetaSchema);
