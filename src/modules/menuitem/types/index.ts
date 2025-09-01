import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";
import type { AdditiveCode, AllergenCode } from "@/modules/menuitem/constants/foodLabels";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

/* --------- Fiyat tipleri --------- */
export type CurrencyCode = "EUR" | "TRY" | "USD";
export type PriceKind = "base" | "deposit" | "surcharge" | "discount";
export type PriceChannel = "delivery" | "pickup" | "dinein";

export interface Money {
  amount: number;
  currency: CurrencyCode;
  taxIncluded?: boolean;
}

export interface ItemPrice {
  kind: PriceKind;
  value: Money;
  listRef?: Types.ObjectId;
  activeFrom?: Date;
  activeTo?: Date;
  minQty?: number;
  channels?: PriceChannel[];
  outlet?: string;
  note?: string;
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

/* --------- Reaction (virtual, hafif tip) --------- */
export type ReactionKindLite = "LIKE" | "FAVORITE" | "BOOKMARK" | "EMOJI" | "RATING";

export interface IMenuItemReactionLite {
  kind: ReactionKindLite;
  emoji?: string | null;
  value?: number | null;
  user?: Types.ObjectId | { _id: Types.ObjectId; name?: string; fullName?: string; email?: string; username?: string };
  createdAt?: Date;
}

export interface IMenuItemRx {               // Opsiyonel özet (denormalize DEĞİL)
  likes?: number;
  favorites?: number;
  bookmarks?: number;
  ratingAvg?: number | null;
  ratingCount?: number;
  emojis?: Record<string, number>;
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

  prices?: ItemPrice[];

  priceListItem?: Types.ObjectId;
  depositPriceListItem?: Types.ObjectId;
}

export interface IMenuItemModifierOption {
  code: string;
  name: TranslatedLabel;
  order?: number;
  isDefault?: boolean;

  prices?: ItemPrice[];

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

  /* --- Virtuals (populate ile gelebilir) --- */
  reactions?: IMenuItemReactionLite[];
  rx?: IMenuItemRx; // eğer controller’da özet enjekte edersen burada taşınır
}
