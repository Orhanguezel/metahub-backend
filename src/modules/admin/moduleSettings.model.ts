import mongoose, { Schema, Model, models } from "mongoose";

interface TranslatedLabel {
  tr: string;
  en: string;
  de: string;
}

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

const ModuleSetting: Model<IModuleSetting> =
  models.ModuleSetting || mongoose.model<IModuleSetting>("ModuleSetting", moduleSettingsSchema);

export default ModuleSetting;
export { ModuleSetting };
