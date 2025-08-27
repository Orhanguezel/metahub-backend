import mongoose, { Schema, type Model, models } from "mongoose";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { IReferencesCategory } from "./types";

/* İngilizce bazlı slug helper (aksan temizleme) */
const toSlug = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* name.* alanlarını dinamik tanımla */
const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, required: true, trim: true, default: "" };
  return acc;
}, {} as Record<SupportedLocale, any>);

const ReferencesCategorySchema = new Schema<IReferencesCategory>(
  {
    name: nameFields,

    tenant: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    /* NOT: unique global değil — compound index ile benzersiz */
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

/* Multi-tenant benzersizlik: aynı tenant'ta aynı slug olamaz */
ReferencesCategorySchema.index({ tenant: 1, slug: 1 }, { unique: true });

/* v2 — slug üretimi: önce manuel değer normalize edilir, yoksa name.en baz alınır */
ReferencesCategorySchema.pre("validate", function (next) {
  const doc = this as any;

  if (doc.slug) {
    doc.slug = toSlug(doc.slug);
  }

  if (!doc.slug && doc.name) {
    const base =
      doc.name.en ||
      Object.values(doc.name).find((v: any) => typeof v === "string" && v.trim()) ||
      "";

    doc.slug = toSlug(base as string);
  }

  if (!doc.slug) {
    // Tamamen boş durumda son çare
    doc.slug = `category-${Date.now().toString(36)}`;
  }

  next();
});

export const ReferencesCategory: Model<IReferencesCategory> =
  (models.referencescategory as Model<IReferencesCategory>) ||
  mongoose.model<IReferencesCategory>("referencescategory", ReferencesCategorySchema);
