import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface IFAQ {
  question: TranslatedLabel;
  answer: TranslatedLabel;
  tenant: string;
  category?: string;
  isPublished: boolean;
  publishedAt?: Date;
  embedding?: number[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
