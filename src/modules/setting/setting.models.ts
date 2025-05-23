// src/modules/setting/setting.models.ts

import { Schema, model, models, Model } from "mongoose";

// LOGO setting değeri için yardımcı tip
export type LogoSettingValue = { light?: string; dark?: string };

export interface ISetting {
  key: string;
  value: string | string[] | { tr: string; en: string; de: string } | Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: [true, "Key is required."],
      unique: true,
      trim: true,
      minlength: [2, "Key must be at least 2 characters."],
      maxlength: [100, "Key cannot exceed 100 characters."],
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, "Value is required."],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ✅ Tip garantili + guardlı model
const Setting: Model<ISetting> = models.Setting || model<ISetting>("Setting", settingSchema);

export { Setting };

