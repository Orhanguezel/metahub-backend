import type { Document, Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export type DiscountType = "percentage" | "fixed" | "free_delivery" | "bxgy";
export type StackingPolicy = "none" | "with_different" | "with_same";
export type PromotionKind = "auto" | "coupon"; // "coupon" da desteklenir (opsiyonel code)

export interface IPromotionRules {
  startsAt?: Date | null;
  endsAt?: Date | null;

  minOrder?: { amount: number; currency?: string };

  scope?: {
    branchIds?: Types.ObjectId[];
    categoryIds?: Types.ObjectId[]; // ref’siz: category | menucategory id’leri gelebilir
    itemIds?: Types.ObjectId[];     // ref’siz: product | menuitem id’leri gelebilir
    serviceTypes?: Array<"delivery" | "pickup" | "dinein">;
  };

  firstOrderOnly?: boolean;
  usageLimit?: number;     // global limit
  perUserLimit?: number;   // kullanıcı başına
}

export interface IPromotionEffect {
  type: DiscountType;
  value?: number;         // percentage(1-100) | fixed(amount) | free_delivery(ignore)
  currency?: string;      // fixed için
  bxgy?: {
    buyQty: number;
    getQty: number;
    itemScope?: {
      itemIds?: Types.ObjectId[];
      categoryIds?: Types.ObjectId[];
    };
  };
}

export interface IPromotion extends Document {
  tenant: string;
  kind: PromotionKind;         // "auto" varsayılan
  code?: string;               // kind="coupon" için opsiyonel
  name: TranslatedLabel;
  description?: TranslatedLabel;

  isActive: boolean;
  isPublished: boolean;
  priority: number;            // daha yüksek önce uygulanır
  stackingPolicy: StackingPolicy;

  rules: IPromotionRules;
  effect: IPromotionEffect;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPromotionRedemption extends Document {
  tenant: string;
  promotion: Types.ObjectId;
  user?: Types.ObjectId | null;
  orderId: Types.ObjectId;
  amount?: number;         // uygulanan indirim
  currency?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* === Evaluate input === */

export interface ICartItemInput {
  itemId: string;
  categoryId?: string;
  unitPrice: number;
  quantity: number;
}

export interface ICartSnapshot {
  items: ICartItemInput[];
  subtotal: number;             // items toplamı
  deliveryFee?: number;
  serviceFee?: number;
  tip?: number;
  currency?: string;            // varsayılan TRY
  serviceType?: "delivery" | "pickup" | "dinein";
  branchId?: string;
  userId?: string;              // redemption limitleri & firstOrder kontrolü için
}
