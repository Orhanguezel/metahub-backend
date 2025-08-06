import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface IPricing {
  title: TranslatedLabel;
  tenant: string;
  description?: TranslatedLabel;
  features?: { [lang in SupportedLocale]?: string[] };
  category?: string;
  isPublished: boolean;
  publishedAt?: Date;
  price: number;
  currency: "USD" | "EUR" | "TRY";
  period: "monthly" | "yearly" | "once";
  isPopular?: boolean;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
