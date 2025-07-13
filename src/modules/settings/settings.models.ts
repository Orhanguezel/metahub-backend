import { Schema, model, models, Model } from "mongoose";
import type { ISettings } from "./types";

const SettingSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, trim: true },
    tenant: { type: String, required: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    isActive: { type: Boolean, default: true },
    images: { type: [Object], default: [] }, // Çoklu resim!
  },
  { timestamps: true }
);

SettingSchema.index({ tenant: 1, key: 1 }, { unique: true });

const Settings: Model<ISettings> = models.Settings || model<ISettings>("Settings", SettingSchema);

export { Settings };
