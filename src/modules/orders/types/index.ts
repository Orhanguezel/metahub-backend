import { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type PaymentMethod = "cash_on_delivery" | "credit_card" | "paypal";
export type OrderStatus = "pending" | "preparing" | "shipped" | "completed" | "cancelled";
export type ServiceType = "delivery" | "pickup" | "dinein";

export type PaymentStatus =
  | "requires_payment"
  | "requires_action"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export interface IMenuModifierSelection {
  groupCode: string;
  optionCode: string;
  quantity?: number;
}

export interface IOrderMenuSelection {
  variantCode?: string;
  modifiers?: IMenuModifierSelection[];
  notes?: string;
  depositIncluded?: boolean;
  snapshot?: {
    name?: TranslatedLabel;
    variantName?: TranslatedLabel;
    sizeLabel?: TranslatedLabel;
    image?: string;
    allergens?: Array<{ key: string; value: TranslatedLabel }>;
    additives?: Array<{ key: string; value: TranslatedLabel }>;
    dietary?: {
      vegetarian?: boolean;
      vegan?: boolean;
      containsAlcohol?: boolean;
      spicyLevel?: number;
    };
  };
}

export interface IPriceComponents {
  base: number;
  deposit?: number;
  modifiersTotal: number;
  modifiers?: Array<{ code: string; qty: number; unitPrice: number; total: number }>;
  currency: string;
}

/** --- Embedded opsiyoneller (projeksiyon uyumlu) --- */
export interface IEmbeddedPayment {
  status: "pending" | "authorized" | "paid" | "failed" | "refunded" | "cancelled";
  method: "card" | "wallet" | "cash";
  provider?: "stripe" | "iyzico" | "paypal" | "adyen" | "other";
  currency: string;
  amount: number;
  externalId?: string;  // provider’a göre generic dış referans
  intentId?: string;    // Stripe PaymentIntent / benzeri
  createdAt?: Date;
  updatedAt?: Date;
  transactions?: Array<{ kind: "auth" | "capture" | "refund" | "void"; amount: number; at: Date; ref?: string }>;
}

export interface IEmbeddedShipment {
  carrier?: string;
  service?: string;
  trackingNo?: string;
  status?: "ready" | "shipped" | "in_transit" | "delivered" | "returned" | "cancelled";
  events?: Array<{ at: Date; code: string; message?: string; location?: string }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEmbeddedReturn {
  reason?: string;
  status?: "requested" | "approved" | "rejected" | "received" | "refunded";
  items?: Array<{ product: Types.ObjectId; qty: number }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEmbeddedRefund {
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  method?: "card" | "wallet" | "manual";
  externalId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Sipariş olay kaydı
export interface IOrderEvent {
  at: Date;
  ev: string;           // ORDER_CREATED | PAYMENT_SUCCEEDED | SHIPPED | ...
  by?: string;          // userId/admin/email vb.
  meta?: any;
}

/** --- ÜRÜN SATIRI --- */
export interface IOrderItem {
  product: Types.ObjectId;
  productType: "product" | "ensotekprod" | "sparepart" | "menuitem";
  quantity: number;
  tenant: string;

  unitPrice: number;
  unitCurrency?: string;
  priceAtAddition: number;
  totalPriceAtAddition: number;

  menu?: IOrderMenuSelection;
  priceComponents?: IPriceComponents;
}

/** Kargo/adres */
export interface IShippingAddress {
  name: string;
  phone: string;
  tenant: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  addressLine?: string;
  houseNumber?: string;
}

/** Snapshots */
export interface IOrderCouponSnapshot {
  code: string;
  type?: string;
  value?: number;
}
export interface IOrderShippingSnapshot {
  code?: string;
  calc?: any;
  price_cents?: number;
}

/** --- ORDER --- */
export interface IOrder {
  user: Types.ObjectId;
  tenant: string;

  serviceType?: ServiceType;
  branch?: Types.ObjectId;
  tableNo?: string;

  addressId?: Types.ObjectId;
  shippingAddress?: IShippingAddress;

  items: IOrderItem[];

  currency?: string;
  subtotal: number;
  deliveryFee?: number;
  tipAmount?: number;
  serviceFee?: number;
  taxTotal?: number;
  finalTotal: number;

  discount?: number;
  coupon?: Types.ObjectId;

  /** embed-first için opsiyoneller */
  payment?: IEmbeddedPayment;
  shipments?: IEmbeddedShipment[];
  returns?: IEmbeddedReturn[];
  refunds?: IEmbeddedRefund[];

  /** mevcut projection alanları */
  paymentMethod: PaymentMethod;
  payments?: Types.ObjectId[];

  // --- yeni alanlar ---
  orderNo?: string;         // MH-YYYYMMDD-HHMM-ABCDE
  idempotencyKey?: string;  // request bazlı (unique per tenant)
  idempotencyExpiresAt?: Date; // TTL için
  reservedUntil?: Date;     // stok rezervasyon TTL
  timeline?: IOrderEvent[]; // olay akışı

  // Snapshots
  couponSnapshot?: IOrderCouponSnapshot;
  shippingSnapshot?: IOrderShippingSnapshot;

  // Tutarların cents sürümü (Pricing servisi ile uyum)
  subtotal_cents?: number;
  deliveryFee_cents?: number;
  tip_cents?: number;
  serviceFee_cents?: number;
  tax_cents?: number;
  discount_cents?: number;
  finalTotal_cents?: number;

  // Ödeme durumu
  paymentStatus?: PaymentStatus;

  status: OrderStatus;
  isDelivered: boolean;
  isPaid: boolean;
  deliveredAt?: Date;
  language?: SupportedLocale;
  createdAt?: Date;
  updatedAt?: Date;
}
