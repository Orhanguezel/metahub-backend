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
  senderName: string;
  senderEmail: string;

  // IMAP (opsiyonel)
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPass?: string;
  imapSecure?: boolean;
  replyToEmail?: string;
}

export interface TenantDomain {
  main: string;
  subdomains?: string[];
  customDomains?: string[];
}

export interface ITenant {
  name: TranslatedLabel;
  slug: string;
  mongoUri: string;
  domain?: TenantDomain;
  emailSettings?: TenantEmailSettings;
  logo?: string;
  images?: ITenantImage[];
  theme?: string;
  enabledModules?: string[];
  isActive?: boolean;
  description?: TranslatedLabel;
  metaTitle?: TranslatedLabel;
  metaDescription?: TranslatedLabel;
  address?: TranslatedLabel;
  phone?: string;
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
