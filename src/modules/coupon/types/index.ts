import type { Document } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export interface ICouponImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface ICoupon extends Document {
  code: string;
  tenant: string;
  title: TranslatedLabel;
  description: TranslatedLabel;
  images?: ICouponImage[];
  discount: number;           // 1–100
  expiresAt: Date;
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
