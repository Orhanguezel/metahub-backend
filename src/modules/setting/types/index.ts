// src/modules/setting/types/index.ts

import type { TranslatedLabel, SupportedLocale } from "@/types/common";

// Logo değeri tipi
export interface ILogoSettingValue {
  light?: {
    url: string;
    publicId?: string;
    thumbnail?: string;
    webp?: string;
  };
  dark?: {
    url: string;
    publicId?: string;
    thumbnail?: string;
    webp?: string;
  };
}

// Labeled link (örn: sosyal link)
export interface ILabeledLink {
  label: TranslatedLabel;
  href?: string;
  url?: string;
  icon?: string;
  tenant?: string;
}

// Sosyal link tipi
export interface ISocialLink {
  url: string;
  icon: string;
  tenant: string;
}

// Value union
export type ISettingValue =
  | string
  | string[]
  | TranslatedLabel
  | ILogoSettingValue
  | Record<string, ILabeledLink>
  | Record<string, ISocialLink>
  | {
      title: TranslatedLabel;
      slogan: TranslatedLabel;
    }
  | {
      href: string;
      icon: string;
    }
  | {
      phone: string;
    }
  | Record<string, any>;

// Asıl Setting Modeli
export interface ISetting {
  key: string;
  tenant: string;
  value: ISettingValue;
  isActive: boolean;
  createdAt: string; // Date yerine string, API’dan öyle geliyor
  updatedAt: string;
}
