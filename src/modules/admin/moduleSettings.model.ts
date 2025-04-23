// src/modules/admin/moduleSettings.model.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IModuleSetting extends Document {
  project: string;
  module: string;
  enabled: boolean;
  visibleInSidebar: boolean;
  useAnalytics: boolean;
  roles: string[];
  icon: string;
  label: string;
  language: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
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
    label: { type: String, required: true },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

// 🔒 Aynı projede aynı modül tekrar eklenemesin
moduleSettingsSchema.index({ project: 1, module: 1 }, { unique: true });

export default mongoose.model<IModuleSetting>("ModuleSetting", moduleSettingsSchema);
