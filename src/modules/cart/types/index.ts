import { Types, Document } from "mongoose";
import { SUPPORTED_LOCALES } from "@/types/common";

export type CartProductType = "product" | "ensotekprod" | "sparepart" | "menuitem"; 
// "product" yeni ad; geriye dönük için "ensotekprod" da kabul ediyoruz.

export type ModifierSelection = {
  groupCode: string;
  optionCode: string;
  quantity?: number;
};

export interface ICartMenuSnapshot {
  name?: Record<string, string>;
  variantName?: Record<string, string>;
  sizeLabel?: Record<string, string>;
  image?: string;
  allergens?: Array<{ key: string; value: Record<string, string> }>;
  additives?: Array<{ key: string; value: Record<string, string> }>;
  dietary?: {
    vegetarian?: boolean;
    vegan?: boolean;
    containsAlcohol?: boolean;
    spicyLevel?: number;
  };
}

export interface ICartMenuSelection {
  variantCode?: string;
  modifiers?: ModifierSelection[];
  depositIncluded?: boolean;
  notes?: string;
  snapshot?: ICartMenuSnapshot;
}

export interface ICartItem {
  _id?: Types.ObjectId;                // ⬅️ alt döküman id (UI için lineId)
  product: Types.ObjectId;             // refPath ile dinamik
  productType: CartProductType;        // ürün tipi
  tenant: string;
  quantity: number;
  priceAtAddition: number;             // ekleme anı birim fiyat
  totalPriceAtAddition: number;        // quantity * priceAtAddition
  unitCurrency?: string;               // ISO kod
  menu?: ICartMenuSelection;           // sadece menuitem için
  priceComponents?: {
    base: number;
    deposit: number;
    modifiersTotal: number;
    modifiers: Array<{ code: string; qty: number; unitPrice: number; total: number }>;
    currency: string;
  };
}

export interface ICart extends Document {
  user: Types.ObjectId;
  tenant: string;
  items: ICartItem[];
  totalPrice: number;                  // sadece satır toplamı (ara toplam)

  // Ek fiyat alanları (kalıcı)
  currency?: string;                   // sepet para birimi
  tipAmount?: number;
  deliveryFee?: number;
  serviceFee?: number;
  taxTotal?: number;
  discount?: number;                   // kupondan gelen

  couponCode?: string | null;
  status: "open" | "ordered" | "cancelled";
  isActive: boolean;
  language: (typeof SUPPORTED_LOCALES)[number];

  // timestamps
  createdAt: Date;
  updatedAt: Date;
}
