import type { SupportedLocale, TranslatedLabel } from "@/types/common";

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

export interface ISetting {
  key: string;
  tenant: string; // Optional tenant field for multi-tenancy
  value:
    | string
    | string[]
    | TranslatedLabel
    | Record<string, any>
    | ILogoSettingValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabeledLink {
  label: TranslatedLabel;
  href?: string;
  url?: string;
  icon?: string;
  tenant?: string; // Optional tenant field for multi-tenancy
}

// Sosyal link
export interface ISocialLink {
  url: string;
  icon: string;
  tenant: string; // Optional tenant field for multi-tenancy
}

// Setting value union
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
    };
