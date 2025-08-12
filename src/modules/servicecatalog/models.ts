import { Schema, Model, models, model } from "mongoose";
import type { IServiceCatalog, IServiceCatalogImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/** i18n alanlarını SUPPORTED_LOCALES ile dinamik kur */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

/** Görsel şeması (services ile birebir aynı) */
export const ServiceCatalogImageSchema = new Schema<IServiceCatalogImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

export const ServiceCatalogSchema = new Schema<IServiceCatalog>(
  {
    tenant: { type: String, required: true, index: true },
    code:   { type: String, required: true, trim: true }, // UPPER_SNAKE

    name: localizedStringField(),
    description: localizedStringField(),

    defaultDurationMin: { type: Number, required: true, min: 1 },
    defaultTeamSize:    { type: Number, required: true, min: 1 },

    suggestedPrice: { type: Number, min: 0 },

    category: { type: Schema.Types.ObjectId, ref: "servicescategory" },
    tags: [{ type: String, trim: true }],

    images: { type: [ServiceCatalogImageSchema], default: [] },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* Indexler */
ServiceCatalogSchema.index({ tenant: 1, code: 1 }, { unique: true });
ServiceCatalogSchema.index({ tenant: 1, isActive: 1 });

/* Çok dilli arama istersen, tüm locale alanları için text index oluşturabilirsin */
const nameTextIndex: Record<string, "text"> = {};
for (const l of SUPPORTED_LOCALES) nameTextIndex[`name.${l}`] = "text";
ServiceCatalogSchema.index(nameTextIndex);

/* Normalize: code → UPPER_SNAKE; tags normalize */
ServiceCatalogSchema.pre("validate", function (next) {
  if (this.code) {
    this.code = this.code.trim().replace(/\s+/g, "_").toUpperCase();
  }
  next();
});

ServiceCatalogSchema.pre("save", function (next) {
  if (Array.isArray(this.tags)) {
    const norm = this.tags
      .filter(Boolean)
      .map((t) => String(t).trim().toLowerCase());
    this.tags = Array.from(new Set(norm));
  }
  next();
});

export const ServiceCatalog: Model<IServiceCatalog> =
  models.servicecatalog || model<IServiceCatalog>("servicecatalog", ServiceCatalogSchema);
