import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export type PricingCurrency = "USD" | "EUR" | "TRY" | "GBP";
export type PricingPeriod = "monthly" | "yearly" | "once";
export type PricingStatus = "draft" | "active" | "archived";
export type PlanType = "free" | "basic" | "pro" | "business" | "enterprise";

export interface IPricingFeatureItemLimit {
  type: "boolean" | "number" | "string" | "unlimited";
  value?: boolean | number | string | null;
}

export interface IPricingFeatureItem {
  key: string;                               // unique per plan
  label: TranslatedLabel;
  tooltip?: TranslatedLabel;
  group?: TranslatedLabel;                    // “Usage”, “Support” vb.
  limit?: IPricingFeatureItemLimit;          // unlimited/number/boolean
  order?: number;
  highlight?: boolean;                       // UI’da öne çıkar
}

export interface IPricingTier {              // usage-based kademeli
  upTo?: number;                             // undefined => infinity
  pricePerUnit: number;                      // >= 0
}

export interface IPricing {
  _id?: Types.ObjectId;

  tenant: string;
  code?: string;                             // UPPER_SNAKE (tenant unique)
  slug?: string;                             // kebab-case (tenant unique)
  title: TranslatedLabel;
  description?: TranslatedLabel;

  // Görsel / CTA
  iconUrl?: string;
  imageUrl?: string;
  ctaLabel?: TranslatedLabel;
  ctaUrl?: string;

  // Plan & görünürlük
  planType?: PlanType;
  category?: string;
  status: PricingStatus;                     // draft/active/archived
  isActive: boolean;

  // Yayınlama
  isPublished: boolean;
  publishedAt?: Date;

  // Fiyatlandırma
  price: number;                             // base price (>=0)
  compareAtPrice?: number;                   // crossed-out
  currency: PricingCurrency;
  period: PricingPeriod;
  setupFee?: number;                         // >=0
  priceIncludesTax?: boolean;                // KDV dahil mi
  vatRate?: number;                          // 0..100

  // Kullanım bazlı
  unitName?: TranslatedLabel;                // “seat”, “GB”, “order”...
  includedUnits?: number;                    // >=0
  pricePerUnit?: number;                     // >=0
  tiers?: IPricingTier[];                    // kademeler

  // Deneme & sözleşme
  trialDays?: number;                        // >=0
  minTermMonths?: number;                    // >=0

  // i18n features kısa/uzun
  features?: { [lang in SupportedLocale]?: string[] };
  featureItems?: IPricingFeatureItem[];

  // Hedefleme
  regions?: string[];                        // ["DE","TR-IST",...]
  segments?: string[];                       // ["b2c","b2b-enterprise",...]

  // “popüler” rozet / sıralama
  isPopular?: boolean;
  order: number;

  // Etkinlik penceresi
  effectiveFrom?: Date;
  effectiveTo?: Date;

  createdAt: Date;
  updatedAt: Date;
}
