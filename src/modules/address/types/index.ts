import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

// ✅ Enum tipi
export type AddressType = "home" | "work" | "billing" | "shipping" | "factory" | "other";

// ✅ Enum sabitleri
export const ADDRESS_TYPE_OPTIONS: AddressType[] = [
  "home",
  "work",
  "billing",
  "shipping",
  "factory",
  "other",
];

// ✅ Address arayüzü
export interface Address {
  _id?: Types.ObjectId | string;
  addressType: AddressType; // ← enum alanı
  userId?: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
  tenant: string;
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  postalCode?: string;
  phone: string;
  email: string;
  country: string;
  isDefault?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
