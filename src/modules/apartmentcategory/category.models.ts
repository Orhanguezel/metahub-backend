import mongoose, { Schema, Model, models } from "mongoose";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import type { IApartmentCategory } from "./types";

// i18n name alanlarını oluştur (boş string ile başlat; en az bir dil zorunluluğunu aşağıda kontrol edeceğiz)
const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang as SupportedLocale] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<SupportedLocale, any>);

const ApartmentCategorySchema = new Schema<IApartmentCategory>(
  {
    name: nameFields,

    tenant: { type: String, required: true, index: true },

    // Slug global unique yerine tenant+slug compound unique ile korunacak
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Opsiyonel bağlamsal alanlar
    city: { type: String },
    district: { type: String },
    zip: { type: String },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ En az bir dilde name doldurulmuş mu?
ApartmentCategorySchema.pre("validate", function (next) {
  // name zorunluluğu: en az bir locale dolu olmalı
  const name = this.name as Record<string, unknown> | undefined;
  const hasAny =
    name &&
    Object.values(name).some((v) => typeof v === "string" && String(v).trim().length > 0);
  if (!hasAny) {
    return next(new mongoose.Error.ValidatorError({ message: "At least one localized name is required" }));
  }

  // slug yoksa ilk dolu isme göre üret
  if (!this.slug && name) {
    const firstValidName =
      Object.values(name).find((val) => typeof val === "string" && String(val).trim()) || "";
    this.slug = String(firstValidName)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

// 🔗 Tenant + slug tekil
ApartmentCategorySchema.index({ tenant: 1, slug: 1 }, { unique: true });

// (İsteğe bağlı) Sık kullanılan filtreler için yardımcı indeksler
ApartmentCategorySchema.index({ tenant: 1, isActive: 1 });
ApartmentCategorySchema.index({ tenant: 1, city: 1, zip: 1 });

const ApartmentCategory: Model<IApartmentCategory> =
  (models.apartmentcategory as Model<IApartmentCategory>) ||
  mongoose.model<IApartmentCategory>("apartmentcategory", ApartmentCategorySchema);

export { ApartmentCategory };
