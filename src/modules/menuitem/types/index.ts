// src/modules/menuitem/types.ts
import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";
import type { AdditiveCode, AllergenCode } from "@/modules/menuitem/constants/foodLabels";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

/* --------- Fiyat tipleri --------- */
export type CurrencyCode = "EUR" | "TRY" | "USD"; // ihtiyaca göre genişlet
export type PriceKind = "base" | "deposit" | "surcharge" | "discount";
export type PriceChannel = "delivery" | "pickup" | "dinein";

export interface Money {
  amount: number;           // küçük birim: 12.50 gibi normal sayı (istersen minor unit ile int tutabilirsin)
  currency: CurrencyCode;   // "EUR" | "TRY" ...
  taxIncluded?: boolean;    // fiyat KDV dahil mi?
}

export interface ItemPrice {
  kind: PriceKind;                  // base, deposit, vs.
  value: Money;                     // asıl tutar
  listRef?: Types.ObjectId;         // varsa merkezi fiyat kalemi (pricelistitem)
  activeFrom?: Date;                // geçerlilik aralığı (opsiyonel)
  activeTo?: Date;
  minQty?: number;                  // x adetten itibaren
  channels?: PriceChannel[];        // sadece şu kanallarda geçerli
  outlet?: string;                  // şube/mağaza kodu (opsiyonel)
  note?: string;                    // açıklama/not
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

  // 💡 Yeni: gömülü fiyatlar
  prices?: ItemPrice[];

  // Opsiyonel: merkezî referans (geriye dönük uyum)
  priceListItem?: Types.ObjectId;
  depositPriceListItem?: Types.ObjectId;
}

export interface IMenuItemModifierOption {
  code: string;
  name: TranslatedLabel;
  order?: number;
  isDefault?: boolean;

  // 💡 Yeni: gömülü fiyatlar
  prices?: ItemPrice[];

  // Opsiyonel: merkezî referans (geriye dönük uyum)
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

/* --------- Diğer alanlar aynı --------- */
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
