import { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type PaymentMethod = "cash_on_delivery" | "credit_card" | "paypal";
export type OrderStatus = "pending" | "preparing" | "shipped" | "completed" | "cancelled";

/** Restoran servis tipi */
export type ServiceType = "delivery" | "pickup" | "dinein";

/** Menü satırı için seçilen modifier opsiyonu (tek ürün BAŞINA adet) */
export interface IMenuModifierSelection {
  groupCode: string;
  optionCode: string;
  quantity?: number; // default 1
}

/** Menü satırı seçimi + snapshot */
export interface IOrderMenuSelection {
  variantCode?: string;
  modifiers?: IMenuModifierSelection[];
  notes?: string;
  depositIncluded?: boolean; // default true (pfand)
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

/** Satır fiyat bileşenleri (tek ürün bazında) */
export interface IPriceComponents {
  base: number;               // variant base
  deposit?: number;           // pfand
  modifiersTotal: number;     // tüm opsiyonların toplamı (tek ürün)
  modifiers?: Array<{ code: string; qty: number; unitPrice: number; total: number }>;
  currency: string;           // örn. "TRY"
}

export type TranslatedLabel = { [key in SupportedLocale]?: string };

/** --- ÜRÜN SATIRI --- */
export interface IOrderItem {
  product: Types.ObjectId;
  productType: "bike" | "ensotekprod" | "sparepart" | "menuitem";
  quantity: number;
  tenant: string;

  /** Eski modeller için zorunlu olabilir, menuitem için BE hesaplar */
  unitPrice: number;
  unitCurrency?: string;

  /** Menü akışı (menuitem için dolar) */
  menu?: IOrderMenuSelection;

  /** BE hesaplanan bileşenler (tek birim) */
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
}

/** --- ORDER --- */
export interface IOrder {
  user: Types.ObjectId;
  tenant: string;

  // Restaurant
  serviceType?: ServiceType;            // delivery|pickup|dinein
  branch?: Types.ObjectId;              // ref: branch
  tableNo?: string;                     // dinein için opsiyonel

  // Adres: delivery için zorunlu, diğerlerinde opsiyonel
  addressId?: Types.ObjectId;
  shippingAddress?: IShippingAddress;

  // Satırlar
  items: IOrderItem[];

  // Tutarlar
  currency?: string;                   // default TRY
  subtotal: number;
  deliveryFee?: number;
  tipAmount?: number;
  serviceFee?: number;
  taxTotal?: number;
  finalTotal: number;

  discount?: number;
  coupon?: Types.ObjectId;

  paymentMethod: PaymentMethod;
  payments?: Types.ObjectId[];
  status: OrderStatus;
  isDelivered: boolean;
  isPaid: boolean;
  deliveredAt?: Date;
  language?: SupportedLocale;
  createdAt?: Date;
  updatedAt?: Date;
}
