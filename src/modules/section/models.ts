import mongoose, { Schema, Model, models } from "mongoose";
import type { ISection } from "@/modules/section/types";
import { SUPPORTED_LOCALES } from "@/types/common";

/** Çok dilli alan tanımı (About modülüyle aynı yaklaşım) */
const localizedStringFields = (): Record<string, any> => {
  const fields: Record<string, any> = {};
  for (const lang of SUPPORTED_LOCALES) {
    fields[lang] = { type: String, trim: true };
  }
  return fields;
};

const SectionSchema = new Schema<ISection>(
  {
    tenant: { type: String, required: true, index: true, trim: true },

    sectionKey: { type: String, required: true, trim: true }, // tenant içinde unique

    // Filtre alanları
    zone:      { type: String, trim: true, default: undefined, index: true },
    component: { type: String, trim: true, default: undefined, index: true },
    category:  { type: String, trim: true, default: undefined, index: true },

    icon: { type: String, default: "MdViewModule", trim: true },

    // ⚠️ DÜZELTME: nested alanları `type:` ile sarmadan doğrudan göm
    label:       localizedStringFields(),
    description: localizedStringFields(),

    variant: { type: String, trim: true, default: undefined },

    enabled: { type: Boolean, default: true },
    order:   { type: Number,  default: 0 },

    roles:  { type: [String], default: [] },
    params: { type: Schema.Types.Mixed, default: {} },

    required: { type: Boolean, default: false },
  },
  // ⚠️ minimize:false → boş objeler ({}), örn. label/description kaybolmasın
  { timestamps: true, minimize: false }
);

// Benzersizlik
SectionSchema.index({ tenant: 1, sectionKey: 1 }, { unique: true });

// Listeleme/filtre hızlandırma
SectionSchema.index({ tenant: 1, zone: 1, component: 1, order: 1, createdAt: 1 });
SectionSchema.index({ tenant: 1, category: 1, order: 1 });

const Section: Model<ISection> =
  (models.section as Model<ISection>) || mongoose.model<ISection>("section", SectionSchema);

export { Section };
