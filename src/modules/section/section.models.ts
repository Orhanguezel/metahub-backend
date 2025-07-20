// models/section.model.ts
import mongoose, { Schema, Model, models } from "mongoose";
import type { ISectionMeta,ISectionSetting } from "@/modules/section/types";
import { SUPPORTED_LOCALES } from "@/types/common";

const labelSchemaFields = SUPPORTED_LOCALES.reduce((fields, lang) => {
  fields[lang] = { type: String, trim: true };
  return fields;
}, {} as Record<string, any>);

const SectionMetaSchema = new Schema<ISectionMeta>(
  {
    tenant: { type: String, required: true, index: true },
    key: { type: String, required: true },
    label: labelSchemaFields,
    description: labelSchemaFields,
    icon: { type: String, default: "MdViewModule" },
    variant: { type: String },
    required: { type: Boolean, default: false },
    defaultOrder: { type: Number, default: 0 },
    defaultEnabled: { type: Boolean, default: true },
    params: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// 🔥 Compound index ile tenant+key unique!
SectionMetaSchema.index({ tenant: 1, key: 1 }, { unique: true });


const SectionMeta: Model<ISectionMeta> =
  models.SectionMeta || mongoose.model<ISectionMeta>("SectionMeta", SectionMetaSchema);

export { SectionMeta };


const SectionSettingSchema = new Schema<ISectionSetting>(
  {
    tenant: { type: String, required: true, index: true },
    sectionKey: { type: String, required: true }, // Her zaman tenant context'inde aranmalı!
    enabled: { type: Boolean },
    order: { type: Number },
    label: labelSchemaFields,
    description: labelSchemaFields,
    params: { type: Schema.Types.Mixed },
    roles: { type: [String] },
  },
  { timestamps: true }
);

// Eğer aynı section birden fazla kez kaydedilemeyecekse, ek index:
SectionSettingSchema.index({ tenant: 1, sectionKey: 1 }, { unique: true });

const SectionSetting: Model<ISectionSetting> =
  models.SectionSetting || mongoose.model<ISectionSetting>("SectionSetting", SectionSettingSchema);

export { SectionSetting };

