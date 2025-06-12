import mongoose, { Schema, Model, models } from "mongoose";
import type { ISection } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// --- Dinamik label alanı ---
const labelSchemaFields = SUPPORTED_LOCALES.reduce((fields, lang) => {
  fields[lang] = { type: String, trim: true, default: "" }; // İster required: true da ekleyebilirsin!
  return fields;
}, {} as Record<string, any>);

const SectionSchema = new Schema<ISection>(
  {
    label: labelSchemaFields,
    description: labelSchemaFields,
    icon: { type: String, default: "MdViewModule" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    visibleInSidebar: { type: Boolean, default: true },
    useAnalytics: { type: Boolean, default: false },
    roles: { type: [String], default: ["admin"] },
  },
  { timestamps: true }
);

const Section: Model<ISection> =
  models.Section || mongoose.model<ISection>("Section", SectionSchema);

export { Section };
