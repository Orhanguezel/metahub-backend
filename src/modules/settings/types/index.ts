// src/modules/setting/types/index.ts

import type { TranslatedLabel } from "@/types/common";

// Labeled link (örn: sosyal link)
export interface ILabeledLink {
  label: TranslatedLabel;
  href?: string;
  url?: string;
  icon?: string;
  tenant?: string;
}

export interface ISettingsImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

// Sadece value için gerekli union
export type ISettingsValue =
  | string
  | string[]
  | TranslatedLabel
  | Record<string, ILabeledLink>
  | Record<string, any>
  | { title: TranslatedLabel; slogan: TranslatedLabel }
  | { href: string; icon: string }
  | { phone: string };

// Ana Settings Modeli
export interface ISettings {
  key: string;
  tenant: string;
  value: ISettingsValue;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images?: ISettingsImage[]; // Logo/Resim alanı (future-proof)
}
