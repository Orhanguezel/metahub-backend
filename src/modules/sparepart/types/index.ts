import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = {
  [key in SupportedLocale]: string;
};

export interface ISparepartImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface ISparepart extends Document {
  // Temel bilgiler
  name: TranslatedLabel; // **Zorunlu**
  tenant: string; // **Zorunlu** (çok kiracılı sistem)
  slug: string; // **Zorunlu**
  description: TranslatedLabel; // **Zorunlu** (zengin HTML destekli)
  brand: string; // **Zorunlu**
  category: Types.ObjectId; // **Zorunlu** (ref: SparepartCategory)
  tags?: string[];

  // Stok & fiyat
  price: number; // **Zorunlu**
  stock: number; // **Zorunlu**
  stockThreshold?: number; // Kritik stok alarmı (opsiyonel)

  // Görseller
  images: ISparepartImage[]; // **Zorunlu**, min 1 ana görsel

  // Teknik özellikler (Sparepart için)
  material?: string; // Gövde malzemesi
  color?: string[]; // Renk seçenekleri
  weightKg?: number; // Ağırlık (kg)
  size?: string; // Ölçüler/ebat (ör: "2x3m")
  powerW?: number; // Motor gücü (varsa)
  voltageV?: number; // Çalışma voltajı (varsa)
  flowRateM3H?: number; // Debi, m³/h (örn: kuleler için)
  coolingCapacityKw?: number; // Soğutma kapasitesi (kW)

  // Elektrik opsiyonları
  isElectric: boolean; // **Zorunlu**
  batteryRangeKm?: number; // Yalnızca elektrikli ise
  motorPowerW?: number; // Yalnızca elektrikli ise

  // Durum & meta
  isActive: boolean; // **Zorunlu**
  isPublished: boolean; // **Zorunlu**
  likes: number; // **Zorunlu, default: 0**
  comments?: Types.ObjectId[];

  // Otomatik zaman damgaları
  createdAt?: Date;
  updatedAt?: Date;
}
