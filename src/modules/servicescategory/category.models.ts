import { Schema, Model, models, model } from "mongoose";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import type { IServicesCategory } from "./types";

/** name alanlarını dinamik kur (required: false, default: "") */
const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<SupportedLocale, any>);

/** Güçlü slugify (aksanları temizle, tr karakterleri normalize et) */
const slugify = (s: string) =>
  s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")     // diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")                         // yalnız a-z0-9 ve '-'
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");

const ServicesCategorySchema = new Schema<IServicesCategory>(
  {
    name: nameFields,

    tenant: { type: String, required: true, index: true },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // DİKKAT: field-level unique yok; compound index aşağıda.
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Indexler */
// tenant+slug benzersiz
ServicesCategorySchema.index({ tenant: 1, slug: 1 }, { unique: true });
// listelerde filtre performansı
ServicesCategorySchema.index({ tenant: 1, isActive: 1 });
// isteğe bağlı: çok dilli arama için text index
const nameTextIndex: Record<string, "text"> = {};
for (const l of SUPPORTED_LOCALES) nameTextIndex[`name.${l}`] = "text";
ServicesCategorySchema.index(nameTextIndex);

/** En az bir dil dolu mu? + slug üretimi */
ServicesCategorySchema.pre("validate", function (next) {
  const nameObj = this.name || ({} as Record<string, unknown>);
  const hasAnyLocale = SUPPORTED_LOCALES.some((l) => {
    const v = nameObj[l];
    return typeof v === "string" && v.trim().length > 0;
  });
  if (!hasAnyLocale) {
    this.invalidate("name", "category.name.atLeastOneLocaleRequired");
  }

  if (!this.slug) {
    // ilk dolu locale değerinden slug üret
    const first = SUPPORTED_LOCALES
      .map((l) => (typeof nameObj[l] === "string" ? String(nameObj[l]) : ""))
      .find((v) => v.trim().length > 0) || "";
    this.slug = slugify(first);
  } else {
    this.slug = slugify(this.slug);
  }
  next();
});

export const ServicesCategory: Model<IServicesCategory> =
  models.servicescategory || model<IServicesCategory>("servicescategory", ServicesCategorySchema);
