import { Schema, model, Document } from "mongoose";

export interface ISetting extends Document {
  key: string;
  value: string | string[] | {
    tr: string;
    en: string;
    de: string;
  };
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
      type: Schema.Types.Mixed, // ✅ supports string | array | object
      required: [true, "Value is required."],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔒 Index for faster queries
settingSchema.index({ key: 1 });

export default model<ISetting>("Setting", settingSchema);
