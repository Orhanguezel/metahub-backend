import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

/* --- Currency & Period --- */
export type CurrencyCode = "USD" | "EUR" | "TRY" | "GBP";
export type BillingPeriod =
  | "ten_days"
  | "fifteen_days"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "once";

export type PriceListStatus = "draft" | "active" | "archived";

/* --- Master Price List --- */
export interface IPriceList {
  _id?: Types.ObjectId;

  tenant: string;                 // required
  code: string;                   // required, UPPER_SNAKE (unique per tenant)

  name: TranslatedLabel;
  description?: TranslatedLabel;

  defaultCurrency: CurrencyCode;

  effectiveFrom: Date;
  effectiveTo?: Date;

  status: PriceListStatus;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* ================================
   Unified PriceListItem (list | catalog)
   ================================ */
export type PriceListItemKind = "list" | "catalog";

export type PriceListCategory =
  | "menuitem_variant"
  | "menuitem_modifier"
  | "deposit"
  | "delivery_fee"
  | "service_fee"
  | "custom";

export interface IPriceListItemSourceRef {
  module?: string;          // örn: "menu"
  entity?: string;          // örn: "menuitem" | "modifier"
  refId?: Types.ObjectId | string;
}

export interface IPriceListItem {
  _id?: Types.ObjectId;

  tenant: string;                 // required
  kind: PriceListItemKind;        // "list" (varsayılan) | "catalog"

  /* ---- LIST MODE alanları ---- */
  listId?: Types.ObjectId;        // ref: "pricelist" (list modunda zorunlu)
  serviceCode?: string;           // UPPER_SNAKE (list modunda zorunlu)
  amount?: number;                // >= 0 (list modunda zorunlu)
  period?: BillingPeriod;         // (list modunda zorunlu)
  notes?: string;

  /* ---- CATALOG MODE alanları ---- */
  code?: string;                  // kebab/lowercase (catalog modunda zorunlu & unique per tenant)
  name?: TranslatedLabel;
  description?: TranslatedLabel;
  category?: PriceListCategory;
  price?: number;                 // >= 0 (catalog modunda zorunlu)
  currency?: CurrencyCode;        // default TRY
  tags?: string[];
  validFrom?: Date;
  validTo?: Date;
  source?: IPriceListItemSourceRef;

  /* ortak */
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
