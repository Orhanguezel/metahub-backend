import type { Document, Types } from "mongoose";

export type SellerKind = "person" | "organization";
export type CurrencyCode = "USD" | "EUR" | "TRY";

export interface ISellerImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface ISellerBilling {
  taxNumber?: string;
  iban?: string;
  defaultCurrency?: CurrencyCode;
  paymentTermDays?: number;
  defaultDueDayOfMonth?: number;   // 1-28
}

export interface ISeller extends Document {
  tenant: string;
  kind?: SellerKind;
  companyName?: string;
  contactName: string;
  images?: ISellerImage[];
  email: string;
  phone: string;
  slug: string;

  userRef?: Types.ObjectId | null;
  addresses?: Array<Types.ObjectId>;

  /** Satıcının hizmet verdiği kategoriler */
  categories?: Array<Types.ObjectId>;   // <<< EKLENDİ

  billing?: ISellerBilling;
  tags?: string[];
  notes?: string;

  avatarUrl?: string;
  coverUrl?: string;
  location?: {
    city?: string;
    country?: string;
  };

  rating?: number;
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
