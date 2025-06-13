import { Schema, model, models, Model } from "mongoose";
import {
  SUPPORTED_LOCALES,
  SupportedLocale,
  TranslatedLabel,
} from "@/types/common";

// ✅ Logo tipi
export interface ILogoSettingValue {
  light?: {
    url: string;
    publicId?: string;
    thumbnail?: string;
    webp?: string;
  };
  dark?: {
    url: string;
    publicId?: string;
    thumbnail?: string;
    webp?: string;
  };
}

// ✅ Setting tipi
export interface ISetting {
  key: string;
  value:
    | string
    | string[]
    | TranslatedLabel
    | Record<string, any>
    | ILogoSettingValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✔ Gelişmiş şema
const SettingSchema = new Schema<ISetting>(
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
      type: Schema.Types.Mixed, // Çok dilli veya generic olabilir
      required: [true, "Value is required."],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🚫 Hardcoded model guard yok, tenant-aware çağrılmalı!
const Setting: Model<ISetting> =
  models.Setting || model<ISetting>("Setting", SettingSchema);

export { Setting };
