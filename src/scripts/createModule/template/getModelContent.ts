export const getModelContent = (CapName: string) => `
import mongoose, { Schema, Document, Model, models } from "mongoose";
import type { TranslatedLabel } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";

export interface I${CapName} extends Document {
  name: TranslatedLabel;
  createdAt: Date;
  updatedAt: Date;
}

const nameFields = SUPPORTED_LOCALES.reduce((fields, lang) => {
  fields[lang] = { type: String, required: lang === "en" }; // en zorunlu!
  return fields;
}, {} as Record<string, any>);

const ${CapName}Schema = new Schema<I${CapName}>({
  name: nameFields,
}, { timestamps: true });

// ✅ Guard + Tip garantisi
const ${CapName}: Model<I${CapName}> =
  models.${CapName} || mongoose.model<I${CapName}>("${CapName}", ${CapName}Schema);

export default ${CapName};
`;
