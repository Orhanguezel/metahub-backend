import type { SupportedLocale } from "@/types/common";

export interface ILibraryCategory {
  name: { [key in SupportedLocale]: string };
  slug: string;
  tenant: string; // Optional tenant field for multi-tenancy
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
