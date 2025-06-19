import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

// 🌐 Çok dilli etiket tipi
export type TranslatedLabel = {
  [key in SupportedLocale]: string;
};

// 🖼️ Resim tipi
export interface IBikeImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

// 🚲 Ana Bike tipi
export interface IBike extends Document {
  name: TranslatedLabel;
  tenant: string; // Çok kiracılılık için isteğe bağlı tenant
  slug: string;
  description: TranslatedLabel;
  brand: string;
  price: number;
  stock: number;
  stockThreshold?: number;
  category: Types.ObjectId;
  tags?: string[];
  images: IBikeImage[];
  frameMaterial?: string;
  brakeType?: string;
  wheelSize?: number;
  gearCount?: number;
  suspensionType?: string;
  color?: string[];
  weightKg?: number;
  isElectric: boolean;
  batteryRangeKm?: number;
  motorPowerW?: number;
  comments?: Types.ObjectId[];
  likes: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
