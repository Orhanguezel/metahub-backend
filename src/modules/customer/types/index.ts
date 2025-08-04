import type { Document, Types } from "mongoose";
import type { Address } from "@/modules/address/types";

export interface ICustomer extends Document {
  tenant: string;                   // Zorunlu, tenant separation için
  companyName: string;              // Zorunlu, firma adı
  contactName: string;              // Zorunlu, muhatap kişi
  email: string;                    // Zorunlu, benzersiz
  phone: string;                    // Zorunlu
  addresses?: Array<Types.ObjectId | string>;     // Çoklu adres desteği (referans)
  isActive: boolean;                // Aktif/Pasif müşteri yönetimi için
  notes?: string;                   // Opsiyonel: Notlar/admin açıklama
  createdAt?: Date;
  updatedAt?: Date;
}
