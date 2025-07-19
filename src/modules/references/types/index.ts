import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

// Çok dilli başlık/içerik
export type TranslatedLabel = { [key in SupportedLocale]?: string };

// Logo görseli
export interface IReferencesImage {
  url: string;           // Zorunlu (orijinal)
  thumbnail: string;     // Zorunlu (küçük boyut)
  webp?: string;         // Opsiyonel (webp desteği)
  publicId?: string;     // Opsiyonel (cloudinary vs. için)
}

// Referans dokümanı
export interface IReferences {
  _id?: Types.ObjectId;
  title?: TranslatedLabel;               // Opsiyonel
  tenant: string;                        // Zorunlu
  slug: string;                          // Zorunlu, unique
  content?: TranslatedLabel;             // Opsiyonel
  images: IReferencesImage[];            // Zorunlu (en az 1 logo)
  category: Types.ObjectId;              // Zorunlu (sektör)
  isPublished: boolean;                  // Panelde göster/gizle
  publishedAt?: Date;
  isActive: boolean;                     // Tamamen pasifleştir (genelde true)
  createdAt: Date;
  updatedAt: Date;
}
