import { Schema, model, models, Model } from "mongoose";

// Logo için özel value tipi
export interface ILogoSettingValue {
  light?: {
    url: string;
    publicId?: string;      // Cloudinary dosya silme için
    thumbnail?: string;     // (Varsa) Thumbnail adresi
    webp?: string;          // (Varsa) Webp adresi
  };
  dark?: {
    url: string;
    publicId?: string;
    thumbnail?: string;
    webp?: string;
  };
}

// Diğer setting türleriyle birlikte logo tipi
export interface ISetting {
  key: string;
  value:
    | string
    | string[]
    | { tr: string; en: string; de: string }
    | Record<string, any>
    | ILogoSettingValue;
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

// Model guard
const Setting: Model<ISetting> = models.Setting || model<ISetting>("Setting", settingSchema);

export { Setting };
