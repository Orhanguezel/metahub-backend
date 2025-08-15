import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };
export type CurrencyCode = "USD" | "EUR" | "TRY";
export type BillingPeriod =
  | "ten_days"       // 10 günlük
  | "fifteen_days"   // 15 günde bir
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "once";
export type PriceListStatus = "draft" | "active" | "archived";

export interface IPriceList {
  _id?: Types.ObjectId;

  // Multi-tenant & kimlik
  tenant: string;                 // required
  code: string;                   // required, UPPER_SNAKE (unique per tenant)

  // i18n başlık/açıklama
  name: TranslatedLabel;          // boş locale'ler "" olabilir
  description?: TranslatedLabel;

  // varsayılanlar
  defaultCurrency: CurrencyCode;  // list default

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
