// src/modules/pricing/types.ts

/* -------- Quote (Checkout fiyat teklifi) tipleri -------- */

export type PricingItemInput = {
  productId: string;
  variantId?: string;
  title?: string;
  image?: string;
  qty: number;
  price_cents: number;          // base fiyat (minor)
  offer_price_cents?: number;   // varsa satır indirimi
  weight_grams?: number;
  attributes?: Record<string, string>;
  currency: string;
};

export type AddressLike = {
  country?: string;
  state?: string;
  city?: string;
  postal?: string;
};

export type PricingInput = {
  tenant: string;
  items: PricingItemInput[];
  shippingMethodCode: string;
  shippingAddress: AddressLike;
  billingAddress?: AddressLike;
  couponCode?: string;
  feeFlags?: Array<"cod" | "express_shipping" | "below_free_shipping" | "all">;
  weight_grams_override?: number;
  currency: string;
  locale?: string;
};

export type FeeApplied = {
  code: string;
  name: Record<string, string>;
  amount_cents: number;
  currency: string;
};

export type PricingOutput = {
  lines: Array<{
    productId: string;
    variantId?: string;
    qty: number;
    unit_cents: number;
    line_total_cents: number;
    currency: string;
    title?: string;
    image?: string;
    attributes?: Record<string, string>;
  }>;
  subtotal_cents: number;
  discount_cents: number;
  shipping: { code: string; price_cents: number; currency: string };
  fees: FeeApplied[];
  tax_cents: number;
  total_cents: number;
  snapshots: {
    tax?: { id?: string; rate: number; inclusive: boolean };
    coupon?: { code: string; type: "percent" | "fixed" | "free_shipping"; value: number } | null;
    shippingMethod?: { id?: string; code: string; calc: "flat" | "table" | "free_over" };
    fees?: string[];
  };
};

/* -------- (Opsiyonel) Pricing Plan şeması için tipler -------- */

export type IPricingFeatureItemLimit = {
  type: "boolean" | "number" | "string" | "unlimited";
  value?: any;
};

export type IPricingFeatureItem = {
  key: string;
  label: Record<string, string>;
  tooltip?: Record<string, string>;
  group?: Record<string, string>;
  limit?: IPricingFeatureItemLimit;
  order?: number;
  highlight?: boolean;
};

export type IPricingTier = {
  upTo?: number;                 // kademeli üst sınır (opsiyonel)
  pricePerUnit: number;          // minor
};

export type IPricing = {
  tenant: string;

  code?: string;
  slug?: string;

  title: Record<string, string>;
  description?: Record<string, string>;

  iconUrl?: string;
  imageUrl?: string;
  ctaLabel?: Record<string, string>;
  ctaUrl?: string;

  planType?: "free" | "basic" | "pro" | "business" | "enterprise";
  category?: string;
  status?: "draft" | "active" | "archived";
  isActive?: boolean;

  isPublished?: boolean;
  publishedAt?: Date;

  price: number;                 // minor
  compareAtPrice?: number;       // minor
  currency: "USD" | "EUR" | "TRY" | "GBP";
  period: "monthly" | "yearly" | "once";
  setupFee?: number;             // minor
  priceIncludesTax?: boolean;
  vatRate?: number;              // 0..100

  unitName?: Record<string, string>;
  includedUnits?: number;
  pricePerUnit?: number;
  tiers?: IPricingTier[];

  trialDays?: number;
  minTermMonths?: number;

  features?: Record<string, string[]>;
  featureItems?: IPricingFeatureItem[];

  regions?: string[];
  segments?: string[];

  isPopular?: boolean;
  order?: number;

  effectiveFrom?: Date;
  effectiveTo?: Date;

  createdAt?: Date;
  updatedAt?: Date;
};
