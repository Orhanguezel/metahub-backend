import { Schema, Model, models, model, Types } from "mongoose";
import slugify from "slugify";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { IMenuCategory, IMenuCategoryImage, TranslatedLabel } from "./types";

/* i18n alanı (apartment paternine uygun) */
const localizedStringField = () => {
  const fields: Record<SupportedLocale, any> = {} as any;
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale as SupportedLocale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

/* Image */
const CategoryImageSchema = new Schema<IMenuCategoryImage>({
  url: { type: String, required: true, trim: true },
  thumbnail: { type: String, required: true, trim: true },
  webp: { type: String, trim: true },
  publicId: { type: String, trim: true }
}, { _id: false });

/* --- Model --- */
const MenuCategorySchema = new Schema<IMenuCategory>({
  tenant: { type: String, required: true, index: true, trim: true },
  code:   { type: String, required: true, trim: true },
  slug:   { type: String, required: true, index: true, lowercase: true, trim: true },

  name:        { type: Object, required: true, default: () => localizedStringField() },
  description: { type: Object, default: () => localizedStringField() },

  images: { type: [CategoryImageSchema], default: [] },
  order:  { type: Number, default: 0, min: 0, max: 100000 },

  isPublished: { type: Boolean, default: true, index: true },
  isActive:    { type: Boolean, default: true, index: true },
}, { timestamps: true });

/* Indexler */
MenuCategorySchema.index({ tenant: 1, code: 1 }, { unique: true });
MenuCategorySchema.index({ tenant: 1, slug: 1 }, { unique: true });

/* Helpers: ID stringify */
function stringifyIdsDeep(obj: any): any {
  if (obj == null) return obj;
  if (obj instanceof Types.ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyIdsDeep);
  if (typeof obj === "object") { for (const k of Object.keys(obj)) obj[k] = stringifyIdsDeep(obj[k]); return obj; }
  return obj;
}
const transform = (_: any, ret: any) => stringifyIdsDeep(ret);
MenuCategorySchema.set("toJSON", { virtuals: true, versionKey: false, transform });
MenuCategorySchema.set("toObject", { virtuals: true, versionKey: false, transform });

/* Slug pre-validate */
MenuCategorySchema.pre("validate", function (next) {
  const anyThis = this as any;
  if (!anyThis.slug) {
    const nameEn: string | undefined = anyThis?.name?.en;
    const base = anyThis.code || nameEn || "category";
    anyThis.slug = slugify(String(base), { lower: true, strict: true });
  } else {
    anyThis.slug = slugify(String(anyThis.slug), { lower: true, strict: true });
  }
  next();
});

export const MenuCategory: Model<IMenuCategory> =
  (models.menucategory as Model<IMenuCategory>) || model<IMenuCategory>("menucategory", MenuCategorySchema);

export { MenuCategorySchema, CategoryImageSchema };
