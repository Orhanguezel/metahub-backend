import type { SupportedLocale } from "@/types/common";

// Çoklu dil admin cevabı için
export type TranslatedLabel = { [key in SupportedLocale]: string };

// constants ile birebir aynı değerler:
export type CommentContentType =
  | "news"
  | "blog"
  | "product"
  | "articles"
  | "services"
  | "bikes"
  | "about"
  | "references"
  | "library"
  | "company"
  | "ensotekprod"
  | "sparepart"
  | "portfolio"    // ⬅️ EKLENDİ (constants'ta vardı)
  | "menuitem"
  | "global";      // ⬅️ testimonial için

export type CommentType =
  | "comment"
  | "testimonial"
  | "review"
  | "question"
  | "answer"
  | "rating";

// Ana model
export interface IComment {
  _id?: any;
  userId?: any;
  name?: string;
  profileImage?: string | { thumbnail?: string; url?: string };
  email?: string;
  tenant: string;
  contentType: CommentContentType;
  contentId: any;
  type?: CommentType; // default: "comment"
  label?: string;
  text: string;
  reply?: {
    text: TranslatedLabel;
    createdAt?: string;
  };
  isPublished: boolean;
  isActive: boolean;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}
