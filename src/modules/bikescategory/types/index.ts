import type { TranslatedLabel } from "@/types/common";

export interface IBikeCategory {
  name: TranslatedLabel; // { tr: string; en: string; ... }
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
