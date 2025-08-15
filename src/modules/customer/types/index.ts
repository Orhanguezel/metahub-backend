import type { Document, Types } from "mongoose";

export type CustomerKind = "person" | "organization";
export type CurrencyCode = "USD" | "EUR" | "TRY";

export interface ICustomerBilling {
  taxNumber?: string;
  iban?: string;
  defaultCurrency?: CurrencyCode;
  paymentTermDays?: number;
  defaultDueDayOfMonth?: number;   // 1-28
}

export interface ICustomer extends Document {
  tenant: string;
  kind?: CustomerKind;
  companyName?: string;
  contactName: string;
  email: string;
  phone: string;
  slug: string;

  // NEW: Opsiyonel kullanıcı bağlantısı (müşteriyi user içinden seçebilmek için)
  userRef?: Types.ObjectId | null;        // ref: user

  addresses?: Array<Types.ObjectId>;      // ref: address
  billing?: ICustomerBilling;
  tags?: string[];
  notes?: string;

  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
