import { Schema, Model, models, model, Types } from "mongoose";
import slugify from "slugify";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/recipes/common";
import type { IRecipe, IRecipeImage, IRecipeIngredient, IRecipeStep, TranslatedLabel } from "./types";
import { PREFERRED_CANONICAL_ORDER } from "./ai.constants";

/* i18n alanı (10 dil) */
const localizedStringField = () => {
  const fields: Record<SupportedLocale, any> = {} as any;
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale as SupportedLocale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

const RecipeImageSchema = new Schema<IRecipeImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false }
);

const IngredientSchema = new Schema<IRecipeIngredient>(
  {
    name: { type: Object, required: true, default: () => localizedStringField() },
    amount: { type: Object, default: () => localizedStringField() }, // çok dilli amount
    order: { type: Number, min: 0, max: 100000, default: 0 },
  },
  { _id: false, strict: false }
);

const StepSchema = new Schema<IRecipeStep>(
  {
    order: { type: Number, required: true, min: 1, max: 100000 },
    text: { type: Object, required: true, default: () => localizedStringField() },
  },
  { _id: false, strict: false }
);

/** Tag’ler: her eleman çok dilli metin objesi */
const TagSchema = new Schema<Record<SupportedLocale, string>>(
  localizedStringField(),
  { _id: false, strict: false }
);

const RecipeSchema = new Schema<IRecipe>(
  {
    tenant: { type: String, required: true, index: true, trim: true },

    slugCanonical: { type: String, required: true, trim: true, lowercase: true, index: true },
    slug: { type: Object, required: true, default: () => localizedStringField() },

    order: { type: Number, default: 0, min: 0, max: 100000, index: true },

    title: { type: Object, required: true, default: () => localizedStringField() },
    description: { type: Object, default: () => localizedStringField() },

    images: { type: [RecipeImageSchema], default: [] },

    cuisines: [{ type: String, trim: true }],
    tags: { type: [TagSchema], default: [] },

    categories: [{ type: Schema.Types.ObjectId, ref: "recipecategory", index: true }],

    servings: { type: Number, min: 1 },
    prepMinutes: { type: Number, min: 0 },
    cookMinutes: { type: Number, min: 0 },
    totalMinutes: { type: Number, min: 0 },
    calories: { type: Number, min: 0 },

    ingredients: { type: [IngredientSchema], default: [] },
    steps: { type: [StepSchema], default: [] },

    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },

    isPublished: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

/* Indexler (mevcut) */
RecipeSchema.index({ tenant: 1, slugCanonical: 1 }, { unique: true });
RecipeSchema.index({ tenant: 1, order: 1 });
RecipeSchema.index({ tenant: 1, isActive: 1, isPublished: 1 });
RecipeSchema.index({ tenant: 1, categories: 1 });
for (const lng of SUPPORTED_LOCALES) {
  RecipeSchema.index({ tenant: 1, [`slug.${lng}`]: 1 });
}

/* Ek indexler (performans + arama) */
// Yayın zaman penceresi + aktiflik
RecipeSchema.index(
  { tenant: 1, isActive: 1, isPublished: 1, effectiveFrom: 1, effectiveTo: 1 },
  { name: "pub_window_idx" }
);
// Süre filtreleri (maxTime)
RecipeSchema.index({ tenant: 1, totalMinutes: 1 }, { name: "time_filter_idx" });

// METİN ARAMASI (q, tag) — koleksiyon başına 1 text index.
// İhtiyaç halinde dilleri daraltabilirsiniz (ör. tr+en+de).
RecipeSchema.index(
  {
    "title.tr": "text",
    "title.en": "text",
    "title.de": "text",
    "title.fr": "text",
    "description.tr": "text",
    "description.en": "text",
    "description.de": "text",
    "description.fr": "text",
    "tags.tr": "text",
    "tags.en": "text",
  },
  { name: "recipe_text_search", default_language: "none" }
);

/* Slug üretimi (slug + slugCanonical) */
function buildSlugPerLocale(input: any, title: TranslatedLabel): TranslatedLabel {
  const out: TranslatedLabel = {};
  for (const lng of SUPPORTED_LOCALES) {
    const raw =
      input && typeof input === "object" && (input as any)[lng]
        ? (input as any)[lng]
        : (title?.[lng] || "");
    (out as any)[lng] = raw ? slugify(String(raw), { lower: true, strict: true }) : "";
  }
  return out;
}

function pickCanonical(slugObj: TranslatedLabel, title: TranslatedLabel): string {
  for (const lng of PREFERRED_CANONICAL_ORDER) {
    const v = (slugObj as any)?.[lng] || (title?.[lng] || "");
    if (String(v).trim()) return slugify(String(v), { lower: true, strict: true });
  }
  return `recipe-${Date.now()}`;
}

RecipeSchema.pre("validate", function (next) {
  const anyThis = this as any;
  anyThis.slug = buildSlugPerLocale(anyThis.slug, anyThis.title);
  anyThis.slugCanonical = pickCanonical(anyThis.slug, anyThis.title);
  next();
});

/* Tarih ve süre tutarlılığı */
RecipeSchema.pre("save", function (next) {
  const anyThis = this as any;
  if (anyThis.effectiveFrom && anyThis.effectiveTo && anyThis.effectiveFrom > anyThis.effectiveTo) {
    anyThis.effectiveTo = undefined;
  }
  if (anyThis.totalMinutes == null) {
    anyThis.totalMinutes =
      (Number(anyThis.prepMinutes) || 0) + (Number(anyThis.cookMinutes) || 0);
  }
  next();
});

/* JSON dönüşümünde ObjectId -> string */
function stringifyIdsDeep(obj: any): any {
  if (obj == null) return obj;
  if (obj instanceof Types.ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyIdsDeep);
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) obj[k] = stringifyIdsDeep(obj[k]);
    return obj;
  }
  return obj;
}
const transform = (_: any, ret: any) => stringifyIdsDeep(ret);
RecipeSchema.set("toJSON", { virtuals: true, versionKey: false, transform });
RecipeSchema.set("toObject", { virtuals: true, versionKey: false, transform });

export const Recipe: Model<IRecipe> =
  (models.recipe as Model<IRecipe>) || model<IRecipe>("recipe", RecipeSchema);

export { RecipeSchema, RecipeImageSchema, IngredientSchema, StepSchema };
