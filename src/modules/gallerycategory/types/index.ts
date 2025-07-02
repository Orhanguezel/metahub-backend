import type { SupportedLocale } from "@/types/common";

export interface IGalleryCategory  {
  name: { [key in SupportedLocale]: string };
  description?: { [key in SupportedLocale]?: string };
  tenant: string; 
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
