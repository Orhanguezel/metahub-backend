// types/index.ts
import type { SupportedLocale } from "@/types/common";

export interface ICatalogRequest {
  _id?: string;
  name: string;                // Kullanıcı adı
  tenant: string;              // Tenant slug/id (multi-tenancy için zorunlu)
  email: string;               // Kullanıcı e-posta
  phone?: string;              // Opsiyonel
  company?: string;            // Opsiyonel
  locale: SupportedLocale;     // Talep edilen dil (kullanıcının seçtiği, zorunlu!)
  catalogType?: string;        // "main" | "product" | "bikes" gibi tenant'ın tanımlayacağı katalog tipi (opsiyonel, ileride birden çok katalog desteği için!)
  sentCatalog?: {              // Log: Gönderilen katalog dosyası (her tenant için farklı olabilir)
    url: string;               // Gönderilen katalog PDF'in URL'si
    fileName: string;          // Dosya adı (opsiyonel)
    fileSize?: number;         // Dosya boyutu (opsiyonel)
  };
  subject: string;             // Kullanıcı mesaj başlığı (tek dil, genelde "Katalog Talebi" olarak set edilir)
  message?: string;            // Kullanıcı mesajı (isteğe bağlı açıklama)
  isRead: boolean;             // Admin panelde okundu durumu
  isArchived: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
