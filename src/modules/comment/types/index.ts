import type { SupportedLocale } from "@/types/common";

// Çoklu dil admin cevabı için
export type TranslatedLabel = { [key in SupportedLocale]: string };

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
  | "global";

export type CommentType = "comment" | "testimonial" | "review" | "question" | "answer" | "rating";

// Ana model
export interface IComment {
  _id?: any; // string veya ObjectId olabilir
  userId?: any; // string veya Types.ObjectId veya { _id, name, email }
  name?: string;
  profileImage?: string | { thumbnail?: string; url?: string }; // Resim objesi veya URL
  email?: string;
  tenant: string;
  contentType: CommentContentType;
  contentId: any; // string veya Types.ObjectId veya { _id, title, slug }
  type?: CommentType; // default: "comment"
  label?: string;
  text: string;
  reply?: {
    text: TranslatedLabel;
    createdAt?: string;
  };
  isPublished: boolean;
  isActive: boolean;
  rating?: number; // opsiyonel puan (örn: review için)
  createdAt?: string;
  updatedAt?: string;
}
