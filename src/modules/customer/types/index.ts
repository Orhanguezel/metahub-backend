import type { Document, Types } from "mongoose";

export type CustomerKind = "person" | "organization";
export type CurrencyCode = "USD" | "EUR" | "TRY";

export interface ICustomerBilling {
  taxNumber?: string;
  iban?: string;
  defaultCurrency?: CurrencyCode;
  paymentTermDays?: number;        // ör: Net 14
  defaultDueDayOfMonth?: number;   // 1-28 (aylık vade için)
}

export interface ICustomer extends Document {
  tenant: string;                        // zorunlu
  kind?: CustomerKind;                   // kişi/kurum ayırımı (ops.)
  companyName?: string;                  // artık ZORUNLU DEĞİL
  contactName: string;                   // zorunlu (muhatap)
  email: string;                         // zorunlu, tenant+email unique
  phone: string;                         // zorunlu, tenant+phone unique
  slug: string;                          // otomatik (companyName/contactName)
  addresses?: Array<Types.ObjectId>;     // ref: address
  billing?: ICustomerBilling;            // basit faturalama tercihleri
  tags?: string[];                       // etiketler
  notes?: string;

  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
