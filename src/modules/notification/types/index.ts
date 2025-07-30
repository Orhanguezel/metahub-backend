import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

// Çoklu dil etiket
export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface INotification {
  user?: Types.ObjectId | null;      // Kullanıcıya özel veya null (genel/tenant)
  tenant: string;                    // Tenant code/slug
  type: "info" | "success" | "warning" | "error";
  title: TranslatedLabel;            // Çoklu dil
  message: TranslatedLabel;          // Çoklu dil
  data?: any;                        // Ek payload (opsiyonel, future-proof)
  isRead: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
