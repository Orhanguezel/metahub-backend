import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };
export type CurrencyCode = "USD" | "EUR" | "TRY";
export type BillingPeriod = "weekly" | "monthly" | "quarterly" | "yearly" | "once";
export type PriceListStatus = "draft" | "active" | "archived";

export interface IPriceList {
  _id?: Types.ObjectId;

  // Multi-tenant & kimlik
  tenant: string;                 // required
  code: string;                   // required, UPPER_SNAKE (unique per tenant)

  // i18n başlık/açıklama
  name: TranslatedLabel;          // boş locale'ler "" olabilir
  description?: TranslatedLabel;

  // kapsam & varsayılanlar
  defaultCurrency: CurrencyCode;  // list default
  segment?: string;
  region?: string;
  apartmentCategoryIds?: Types.ObjectId[];  // ref: "apartmentcategory"[]

  // geçerlilik
  effectiveFrom: Date;
  effectiveTo?: Date;

  // durum
  status: PriceListStatus;        // draft|active|archived
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPriceListItem {
  _id?: Types.ObjectId;

  // Multi-tenant & ilişki
  tenant: string;                 // required
  listId: Types.ObjectId;         // ref: "pricelist" required

  // hizmet & fiyat
  serviceCode: string;            // ref to ServiceCatalog.code (UPPER_SNAKE)
  amount: number;                 // >= 0
  currency?: CurrencyCode;        // verilmezse controller'da list.defaultCurrency atanır
  period: BillingPeriod;          // weekly/monthly/.../once
  notes?: string;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
