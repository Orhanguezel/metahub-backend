// types/address.ts
import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type AddressType =
  | "home"
  | "work"
  | "billing"
  | "shipping"
  | "factory"
  | "warehouse"
  | "showroom"
  | "branch"
  | "other";

export const ADDRESS_TYPE_OPTIONS: AddressType[] = [
  "home",
  "work",
  "billing",
  "shipping",
  "factory",
  "warehouse",
  "showroom",
  "branch",
  "other",
];

// Final Address interface
export interface Address {
  _id?: Types.ObjectId | string;
  addressType: AddressType;
  userId?: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
  customerId?: Types.ObjectId | string;
  sellerId?: Types.ObjectId | string; 
  tenant: string;
  addressLine: string;   // her ülkede zorunlu!
  street?: string;       // DE, FR, ES, PL için
  houseNumber?: string;  // DE, FR, ES, PL için
  city?: string;         // hepsinde
  district?: string;     // TR, opsiyonel
  province?: string;     // TR, DE, EN, FR, ES, PL
  postalCode?: string;   // hepsinde
  country?: string;      // kod veya isim
  phone?: string;
  email?: string;
  isDefault?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

