// src/modules/menuitem/types.ts
import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";
import type { AdditiveCode, AllergenCode } from "@/modules/menuitem/constants/foodLabels";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

/* --------- Fiyat tipleri --------- */
export type CurrencyCode = "EUR" | "TRY" | "USD";
export type PriceKind = "base" | "deposit" | "surcharge" | "discount";
export type PriceChannel = "delivery" | "pickup" | "dinein";

export interface Money {
  amount: number;           // 12.5 gibi
  currency: CurrencyCode;   // UPPERCASE
  taxIncluded?: boolean;    // default true
}

export interface ItemPrice {
  kind: PriceKind;
  value: Money;
  listRef?: Types.ObjectId;         // pricelistitem referansı (opsiyonel)
  activeFrom?: Date;                // geçerlilik aralıkları (ops.)
  activeTo?: Date;
  minQty?: number;                  // qty eşikleri (ops.)
  channels?: PriceChannel[];        // geçerli kanallar (ops.)
  outlet?: string;                  // şube kodu (ops.)
  note?: string;                    // not (ops.)
}

/* --------- KV --------- */
export interface IKeyValueI18n<K extends string = string> {
  key: K;
  value: TranslatedLabel;
}

export interface IMenuItemImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

/* --------- Variant & Modifiers --------- */
export interface IMenuItemVariant {
  code: string;
  name: TranslatedLabel;
  order?: number;
  isDefault?: boolean;
  sku?: string;
  barcode?: string;

  sizeLabel?: TranslatedLabel;
  volumeMl?: number;
  netWeightGr?: number;

  // Gömülü fiyatlar (yeni nesil)
  prices?: ItemPrice[];

  // Geriye dönük merkezi referanslar (ops.)
  priceListItem?: Types.ObjectId;
  depositPriceListItem?: Types.ObjectId;
}

export interface IMenuItemModifierOption {
  code: string;
  name: TranslatedLabel;
  order?: number;
  isDefault?: boolean;
  

  // Gömülü fiyatlar
  prices?: ItemPrice[];

  // Geriye dönük referans
  priceListItem?: Types.ObjectId;
}

export interface IMenuItemModifierGroup {
  code: string;
  name: TranslatedLabel;
  order?: number;
  minSelect?: number;
  maxSelect?: number;
  options: IMenuItemModifierOption[];
  isRequired?: boolean;
}

/* --------- Diğer alanlar --------- */
export interface IMenuItemDietary {
  vegetarian?: boolean; vegan?: boolean; pescatarian?: boolean;
  halal?: boolean; kosher?: boolean; glutenFree?: boolean; lactoseFree?: boolean;
  nutFree?: boolean; eggFree?: boolean; porkFree?: boolean;
  spicyLevel?: number; containsAlcohol?: boolean;
  caffeineMgPerServing?: number; abv?: number; caloriesKcal?: number;
  macros?: { proteinGr?: number; carbsGr?: number; fatGr?: number };
}

export interface IMenuItemOps {
  availability?: { delivery?: boolean; pickup?: boolean; dinein?: boolean };
  minPrepMinutes?: number;
  kitchenSection?: string;
  availableFrom?: Date;
  availableTo?: Date;
}

export interface IMenuItemCategoryRef {
  category: Types.ObjectId;
  order?: number;
  isFeatured?: boolean;
}

export interface IMenuItem {
  _id?: Types.ObjectId;
  tenant: string;
  code: string;
  slug: string;

  name: TranslatedLabel;
  description?: TranslatedLabel;

  images: IMenuItemImage[];

  categories: IMenuItemCategoryRef[];
  variants: IMenuItemVariant[];
  modifierGroups?: IMenuItemModifierGroup[];

  allergens?: IKeyValueI18n<AllergenCode>[];
  additives?: IKeyValueI18n<AdditiveCode>[];

  dietary?: IMenuItemDietary;
  ops?: IMenuItemOps;

  sku?: string;
  barcode?: string;
  taxCode?: string;

  isPublished: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
