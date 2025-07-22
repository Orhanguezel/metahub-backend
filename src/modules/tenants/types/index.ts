export type TranslatedLabel = Record<string, string>; // { en: "", tr: "", ... }

export interface ITenantImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface TenantEmailSettings {
  // SMTP
  smtpHost: string;
  smtpPort: number;
  smtpSecure?: boolean;
  smtpUser: string;
  smtpPass: string;
  senderName: string;    // Dinamik: "Brand" adı vs.
  senderEmail: string;   // Gönderici e-maili

  // IMAP (Opsiyonel)
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPass?: string;
  imapSecure?: boolean;
  replyToEmail?: string;   // Yanıtlama adresi (opsiyonel)
  adminEmail?: string;     // Tenant'a özel admin mail (opsiyonel, eklenebilir)
}

export interface TenantDomain {
  main: string;                 // Ana domain, zorunlu!
  subdomains?: string[];        // Subdomainler (isteğe bağlı)
  customDomains?: string[];     // Custom domainler (isteğe bağlı)
}

export interface ITenant {
  name: TranslatedLabel;        // Çoklu dil: { en, tr, de, ... }
  slug: string;                 // Kısa ad (URL için)
  mongoUri: string;             // Her tenant’a özel DB
  domain: TenantDomain;         // Domain bilgisi (main zorunlu)
  emailSettings: TenantEmailSettings;   // SMTP/IMAP/email context (zorunlu)
  logo?: string;                // Ana logo (opsiyonel)
  images?: ITenantImage[];      // Çoklu görsel desteği
  theme?: string;               // Tema adı
  isActive?: boolean;           // Aktiflik durumu
  description?: TranslatedLabel;      // Açıklama (çoklu dil)
  metaTitle?: TranslatedLabel;        // SEO başlık
  metaDescription?: TranslatedLabel;  // SEO açıklama
  address?: TranslatedLabel;          // Adres (çoklu dil)
  phone?: string;               // Telefon
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
    youtube?: string;
    [key: string]: string | undefined;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
