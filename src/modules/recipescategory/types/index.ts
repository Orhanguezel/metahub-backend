import type { SupportedLocale }  from "@/types/recipes/common";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export interface IRecipeCategory {
  name: TranslatedLabel;  // en az bir dil dolu
  slug: string;
  tenant: string;
  isActive: boolean;
  /** Görüntüleme sırası (küçük -> önce) */
  order?: number;         // 0..100000
  createdAt: Date;
  updatedAt: Date;
}
