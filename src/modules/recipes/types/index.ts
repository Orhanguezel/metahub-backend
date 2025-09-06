import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/recipes/common";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export interface IRecipeImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IRecipeIngredient {
  name: TranslatedLabel;        // çok dilli
  amount?: TranslatedLabel;     // çok dilli ölçü (örn. { tr:"200 g", en:"200 g", ... })
  order?: number;               // 0..100000
}

export interface IRecipeStep {
  order: number;                // 1..100000
  text: TranslatedLabel;        // çok dilli
}

/** (ileride) Kategori bağları — recipecategory modülü geldiğinde populate edeceğiz */
export type RecipeCategoryId = Types.ObjectId;

export interface IRecipe {
  _id?: Types.ObjectId;

  tenant: string;               // index
  /** Canonical tekil slug (benzersizlik ve route fallback için) */
  slugCanonical: string;        // tenant + slugCanonical unique
  /** 10 dilli slug */
  slug: TranslatedLabel;

  /** Genel görüntüleme sırası (küçük → önce) */
  order?: number;               // 0..100000

  /** 10 dilli başlık & açıklama */
  title: TranslatedLabel;
  description?: TranslatedLabel;

  images: IRecipeImage[];       // kapak/galeri görselleri

  cuisines?: string[];          // "turkish","italian"...
  /** 10 dilli tag listesi */
  tags?: TranslatedLabel[];

  categories?: RecipeCategoryId[]; // ref: "recipecategory" (opsiyonel)

  servings?: number;            // ≥1
  prepMinutes?: number;         // ≥0
  cookMinutes?: number;         // ≥0
  totalMinutes?: number;        // ≥0 (prep+cook default)
  calories?: number;            // ≥0

  ingredients: IRecipeIngredient[];
  steps: IRecipeStep[];

  effectiveFrom?: Date;         // yayın başlangıcı
  effectiveTo?: Date;           // yayın bitişi

  isPublished: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
