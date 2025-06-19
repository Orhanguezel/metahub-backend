import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface ISection {
  label: TranslatedLabel;
  tenant: string; // Optional tenant field for multi-tenancy
  description?: TranslatedLabel;
  icon?: string;
  order?: number;
  isActive?: boolean;
  visibleInSidebar?: boolean;
  useAnalytics?: boolean;
  roles?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
