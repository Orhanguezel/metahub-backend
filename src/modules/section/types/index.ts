import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface ISection {
  label: TranslatedLabel;
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
