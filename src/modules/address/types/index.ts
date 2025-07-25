import { Types } from "mongoose";

export interface Address {
  _id?: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
  companyId?: Types.ObjectId | string; // Eklendi
  tenant: string;
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;         // <-- EKLE!
  country: string;       // <-- zorunlu!
  isDefault?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

