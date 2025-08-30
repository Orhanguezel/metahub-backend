import { Schema, Model, models, model, Types } from "mongoose";
import slugify from "slugify";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { IMenu, IMenuImage, IMenuCategoryRef } from "./types";

/* i18n alanı */
const localizedStringField = () => {
  const fields: Record<SupportedLocale, any> = {} as any;
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale as SupportedLocale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

const MenuImageSchema = new Schema<IMenuImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false }
);

const MenuCategoryRefSchema = new Schema<IMenuCategoryRef>(
  {
    category: { type: Schema.Types.ObjectId, ref: "menucategory", required: true, index: true },
    order: { type: Number, default: 0, min: 0, max: 100000 },
    isFeatured: { type: Boolean, default: false },
  },
  { _id: false }
);

const MenuSchema = new Schema<IMenu>(
  {
    tenant: { type: String, required: true, index: true, trim: true },
    code: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },

    /** Menünün genel sırası */
    order: { type: Number, default: 0, min: 0, max: 100000, index: true },

    name: { type: Object, required: true, default: () => localizedStringField() },
    description: { type: Object, default: () => localizedStringField() },

    images: { type: [MenuImageSchema], default: [] },

    branches: [{ type: Schema.Types.ObjectId, ref: "branch", index: true }],
    categories: { type: [MenuCategoryRefSchema], default: [] },

    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },

    isPublished: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

/* Indexler */
MenuSchema.index({ tenant: 1, code: 1 }, { unique: true });
MenuSchema.index({ tenant: 1, slug: 1 }, { unique: true });
MenuSchema.index({ tenant: 1, order: 1 }); // sıralama için
MenuSchema.index({ tenant: 1, isActive: 1, isPublished: 1 });
MenuSchema.index({ tenant: 1, "categories.category": 1 });

/* Yardımcılar: JSON dönüşümünde ObjectId -> string */
function stringifyIdsDeep(obj: any): any {
  if (obj == null) return obj;
  if (obj instanceof Types.ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyIdsDeep);
  if (typeof obj === "object") { for (const k of Object.keys(obj)) obj[k] = stringifyIdsDeep(obj[k]); return obj; }
  return obj;
}
const transform = (_: any, ret: any) => stringifyIdsDeep(ret);
MenuSchema.set("toJSON", { virtuals: true, versionKey: false, transform });
MenuSchema.set("toObject", { virtuals: true, versionKey: false, transform });

/* Slug üretimi */
MenuSchema.pre("validate", function (next) {
  const anyThis = this as any;
  if (!anyThis.slug) {
    const base = anyThis.code || anyThis?.name?.en || "menu";
    anyThis.slug = slugify(String(base), { lower: true, strict: true });
  } else {
    anyThis.slug = slugify(String(anyThis.slug), { lower: true, strict: true });
  }
  next();
});

/* Tarih tutarlılığı (opsiyonel) */
MenuSchema.pre("save", function (next) {
  const anyThis = this as any;
  if (anyThis.effectiveFrom && anyThis.effectiveTo && anyThis.effectiveFrom > anyThis.effectiveTo) {
    anyThis.effectiveTo = undefined; // emniyet
  }
  next();
});

export const Menu: Model<IMenu> =
  (models.menu as Model<IMenu>) || model<IMenu>("menu", MenuSchema);

export { MenuSchema, MenuImageSchema, MenuCategoryRefSchema };
