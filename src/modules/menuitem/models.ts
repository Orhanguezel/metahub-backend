// src/modules/menuitem/model.ts
import { Schema, Model, models, model, Types } from "mongoose";
import slugify from "slugify";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type {
  IMenuItem, IMenuItemImage, IMenuItemVariant, IMenuItemModifierGroup,
  IMenuItemModifierOption, IMenuItemCategoryRef, IKeyValueI18n,
  ItemPrice, Money
} from "./types";
import { ADDITIVE_KEYS, ALLERGEN_KEYS } from "@/modules/menuitem/constants/foodLabels";

/* i18n alan fabrika */
const localizedStringField = () => {
  const fields: Record<SupportedLocale, any> = {} as any;
  for (const locale of SUPPORTED_LOCALES) fields[locale as SupportedLocale] = { type: String, trim: true, default: "" };
  return fields;
};

/* --------- KV şemaları (sabit anahtar doğrulamalı) --------- */
const AllergenKV = new Schema<IKeyValueI18n>({
  key:   { type: String, required: true, trim: true, enum: ALLERGEN_KEYS },
  value: { type: Object, required: false },
}, { _id: false });

const AdditiveKV = new Schema<IKeyValueI18n>({
  key:   { type: String, required: true, trim: true, enum: ADDITIVE_KEYS },
  value: { type: Object, required: false },
}, { _id: false });

/* --------- Görsel --------- */
const ImageSchema = new Schema<IMenuItemImage>({
  url: { type: String, required: true, trim: true },
  thumbnail: { type: String, required: true, trim: true },
  webp: { type: String, trim: true },
  publicId: { type: String, trim: true }
}, { _id: false });

/* --------- Fiyat alt dokümanları --------- */
const MoneySchema = new Schema<Money>({
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, enum: ["EUR","TRY","USD"] },
  taxIncluded: { type: Boolean, default: true },
}, { _id: false });

const ItemPriceSchema = new Schema<ItemPrice>({
  kind: { type: String, required: true, enum: ["base","deposit","surcharge","discount"] },
  value: { type: MoneySchema, required: true },
  listRef: { type: Schema.Types.ObjectId, ref: "pricelistitem" },
  activeFrom: { type: Date },
  activeTo: { type: Date },
  minQty: { type: Number, min: 0 },
  channels: [{ type: String, enum: ["delivery","pickup","dinein"] }],
  outlet: { type: String, trim: true },
  note: { type: String, trim: true },
}, { _id: true });

/* --------- Variant --------- */
const VariantSchema = new Schema<IMenuItemVariant>({
  code: { type: String, required: true, trim: true },
  name: { type: Object, required: true, default: () => localizedStringField() },
  order: { type: Number, default: 0, min: 0, max: 100000 },
  isDefault: { type: Boolean, default: false },
  sku: { type: String, trim: true },
  barcode: { type: String, trim: true },
  sizeLabel: { type: Object, default: () => localizedStringField() },
  volumeMl: { type: Number, min: 0, max: 100000 },
  netWeightGr: { type: Number, min: 0, max: 100000 },

  // 💡 Yeni: gömülü fiyatlar
  prices: { type: [ItemPriceSchema], default: [] },

  // Geriye dönük alanlar
  priceListItem: { type: Schema.Types.ObjectId, ref: "pricelistitem" },
  depositPriceListItem: { type: Schema.Types.ObjectId, ref: "pricelistitem" },
}, { _id: false });

/* --------- Modifier --------- */
const ModifierOptionSchema = new Schema<IMenuItemModifierOption>({
  code: { type: String, required: true, trim: true },
  name: { type: Object, required: true, default: () => localizedStringField() },
  order: { type: Number, default: 0, min: 0, max: 100000 },
  isDefault: { type: Boolean, default: false },

  // 💡 Yeni: gömülü fiyatlar
  prices: { type: [ItemPriceSchema], default: [] },

  // Geriye dönük
  priceListItem: { type: Schema.Types.ObjectId, ref: "pricelistitem" },
}, { _id: false });

const ModifierGroupSchema = new Schema<IMenuItemModifierGroup>({
  code: { type: String, required: true, trim: true },
  name: { type: Object, required: true, default: () => localizedStringField() },
  order: { type: Number, default: 0, min: 0, max: 100000 },
  minSelect: { type: Number, default: 0, min: 0, max: 100 },
  maxSelect: { type: Number, default: 1, min: 1, max: 100 },
  isRequired: { type: Boolean, default: false },
  options: { type: [ModifierOptionSchema], default: [] },
}, { _id: false });

/* --------- Kategori ref --------- */
const CategoryRefSchema = new Schema<IMenuItemCategoryRef>({
  category: { type: Schema.Types.ObjectId, ref: "menucategory", required: true, index: true },
  order: { type: Number, default: 0, min: 0, max: 100000 },
  isFeatured: { type: Boolean, default: false },
}, { _id: false });

/* --------- Ana şema --------- */
const MenuItemSchema = new Schema<IMenuItem>({
  tenant: { type: String, required: true, index: true, trim: true },
  code: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true, index: true },

  name: { type: Object, required: true, default: () => localizedStringField() },
  description: { type: Object, default: () => localizedStringField() },

  images: { type: [ImageSchema], default: [] },

  categories: { type: [CategoryRefSchema], default: [] },
  variants: { type: [VariantSchema], default: [] },
  modifierGroups: { type: [ModifierGroupSchema], default: [] },

  allergens: { type: [AllergenKV], default: [] },
  additives: { type: [AdditiveKV], default: [] },

  dietary: {
    vegetarian: { type: Boolean, default: false },
    vegan: { type: Boolean, default: false },
    pescatarian: { type: Boolean, default: false },
    halal: { type: Boolean, default: false },
    kosher: { type: Boolean, default: false },
    glutenFree: { type: Boolean, default: false },
    lactoseFree: { type: Boolean, default: false },
    nutFree: { type: Boolean, default: false },
    eggFree: { type: Boolean, default: false },
    porkFree: { type: Boolean, default: false },
    spicyLevel: { type: Number, min: 0, max: 3, default: 0 },
    containsAlcohol: { type: Boolean, default: false },
    caffeineMgPerServing: { type: Number, min: 0, max: 5000 },
    abv: { type: Number, min: 0, max: 100 },
    caloriesKcal: { type: Number, min: 0, max: 50000 },
    macros: { proteinGr: { type: Number, min: 0, max: 5000 }, carbsGr: { type: Number, min: 0, max: 5000 }, fatGr: { type: Number, min: 0, max: 5000 } }
  },

  ops: {
    availability: { delivery: { type: Boolean, default: true }, pickup: { type: Boolean, default: true }, dinein: { type: Boolean, default: true } },
    minPrepMinutes: { type: Number, min: 0, max: 240, default: 0 },
    kitchenSection: { type: String, trim: true },
    availableFrom: { type: Date },
    availableTo: { type: Date },
  },

  sku: { type: String, trim: true },
  barcode: { type: String, trim: true },
  taxCode: { type: String, trim: true },

  isPublished: { type: Boolean, default: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

/* Indexler */
MenuItemSchema.index({ tenant: 1, code: 1 }, { unique: true });
MenuItemSchema.index({ tenant: 1, slug: 1 }, { unique: true });
MenuItemSchema.index({ tenant: 1, "categories.category": 1 });
MenuItemSchema.index({ tenant: 1, isActive: 1, isPublished: 1 });

/* Slug normalize + min/max uyumu */
MenuItemSchema.pre("validate", function (next) {
  const anyThis = this as any;
  if (!anyThis.slug) {
    const base = anyThis.code || anyThis?.name?.en || "menuitem";
    anyThis.slug = slugify(String(base), { lower: true, strict: true });
  } else {
    anyThis.slug = slugify(String(anyThis.slug), { lower: true, strict: true });
  }
  if (Array.isArray(anyThis.modifierGroups)) {
    for (const g of anyThis.modifierGroups) {
      if (g.minSelect != null && g.maxSelect != null && g.minSelect > g.maxSelect) g.maxSelect = g.minSelect;
    }
  }
  next();
});

/* JSON dönüşümü: ObjectId -> string */
import { Types as MTypes } from "mongoose";
function stringifyIdsDeep(obj: any): any {
  if (obj == null) return obj;
  if (obj instanceof MTypes.ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyIdsDeep);
  if (typeof obj === "object") { for (const k of Object.keys(obj)) obj[k] = stringifyIdsDeep(obj[k]); return obj; }
  return obj;
}
const transform = (_: any, ret: any) => stringifyIdsDeep(ret);
MenuItemSchema.set("toJSON", { virtuals: true, versionKey: false, transform });
MenuItemSchema.set("toObject", { virtuals: true, versionKey: false, transform });

export const MenuItem: Model<IMenuItem> =
  (models.menuitem as Model<IMenuItem>) || model<IMenuItem>("menuitem", MenuItemSchema);

export {
  MenuItemSchema, VariantSchema, ModifierGroupSchema, ModifierOptionSchema,
  CategoryRefSchema, ImageSchema, ItemPriceSchema, MoneySchema
};
