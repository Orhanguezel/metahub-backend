import type { SupportedLocale } from "@/types/common";

// Çoklu dil admin cevabı için
export type TranslatedLabel = { [key in SupportedLocale]: string };

// Mongoose ile tam uyumlu tip
export interface IComment {
  _id?: any; // string veya ObjectId olabilir
  userId?: any; // string veya Types.ObjectId
  name?: string;
  email?: string;
  tenant: string;
  contentType: string;
  contentId: any; // string veya Types.ObjectId
  label?: string;
  text: string;
  reply?: {
    text: TranslatedLabel;
    createdAt?: string;
  };
  isPublished: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

