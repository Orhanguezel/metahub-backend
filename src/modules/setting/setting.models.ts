import { Schema, model, models, Document, Model } from "mongoose";

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
const Setting: Model<ISetting> =
  models.Setting || model<ISetting>("Setting", settingSchema);

export default Setting; // default export
export { Setting };     // named export (standart için)

