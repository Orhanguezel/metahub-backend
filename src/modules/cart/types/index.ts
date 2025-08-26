import { Types } from "mongoose";

export type CartProductType = "bike" | "ensotekprod" | "sparepart" | "menuitem";

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
  product: Types.ObjectId;               // refPath ile dinamik
  productType: CartProductType;          // ürün tipi
  tenant: string;
  quantity: number;
  priceAtAddition: number;               // o anki birim fiyat (sabitlenir)
  totalPriceAtAddition: number;          // quantity * priceAtAddition
  unitCurrency?: string;                 // (ops) örn. "EUR"
  menu?: ICartMenuSelection;             // sadece menuitem için
  priceComponents?: {                    // sadece menuitem için (opsiyonel debug/analiz)
    base: number;
    deposit: number;
    modifiersTotal: number;
    modifiers: Array<{ code: string; qty: number; unitPrice: number; total: number }>;
    currency: string;
  };
}

export interface ICart {
  user: Types.ObjectId;
  tenant: string;
  items: ICartItem[];
  totalPrice: number;
  couponCode?: string | null;
  status: "open" | "ordered" | "cancelled";
  isActive: boolean;
  discount?: number;
  createdAt: Date;
  updatedAt: Date;
  language: string;
}
