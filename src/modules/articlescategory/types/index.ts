import type { SupportedLocale } from "@/types/common";

export interface IArticlesCategory {
  name: { [key in SupportedLocale]: string };
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
