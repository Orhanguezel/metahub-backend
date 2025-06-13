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
}

// Sosyal link
export interface ISocialLink {
  url: string;
  icon: string;
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
