import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface ICouponImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}


// ✅ Coupon Interface
export interface ICoupon extends Document {
  code: string;
  tenant: string; // Çok kiracılı sistem için
  title: TranslatedLabel;
  description: TranslatedLabel;
  images?: ICouponImage[];
  discount: number;
  expiresAt: Date;
   isPublished: boolean;
  publishedAt?: Date;
  createdAt?: Date;
  isActive: boolean;
  updatedAt?: Date;
}
