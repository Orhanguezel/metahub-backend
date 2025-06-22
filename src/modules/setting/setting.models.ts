import { Schema, model, models, Model } from "mongoose";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";

// Sadece logo için gerekli tip
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

// Temalar ve bazı özel alanlar için sadece string/string[] yeterlidir.
// Çoklu dil gerektiren alanlar için sadece TranslatedLabel kullanılacak.

// Ana değer tipi — sadece gerekli union'lar bırakıldı
export type SettingValue =
  | string
  | string[]
  | ILogoSettingValue
  | TranslatedLabel
  | Record<string, any>; // Diğer özel alanlar için (ör: sosyal linkler, labele sahip objeler)

export interface ISetting {
  key: string;
  tenant: string;            // Tenant context zorunlu
  value: SettingValue;       // Standart ve sade union
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: [true, "Key is required."],
      trim: true,
      minlength: [2, "Key must be at least 2 characters."],
      maxlength: [100, "Key cannot exceed 100 characters."],
    },
    tenant: {
      type: String,
      required: [true, "Tenant is required."], // Mutlaka tenant contexti zorunlu
      index: true,                            // Performans için
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

// Tenant + key birleşik index: Her tenant kendi settingini benzersiz saklar!
SettingSchema.index({ tenant: 1, key: 1 }, { unique: true });

// Global model kullanılmaz, mutlaka tenant-aware injection yapılmalı!
const Setting: Model<ISetting> = models.Setting || model<ISetting>("Setting", SettingSchema);

export { Setting };
