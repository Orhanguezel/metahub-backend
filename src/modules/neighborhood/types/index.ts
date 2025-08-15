import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

/** v2 – Neighborhood (Mahalle) */
export interface INeighborhood {
  _id?: Types.ObjectId;

  /** Çok dilli ad */
  name: { [key in SupportedLocale]?: string };

  /** Tenant + slug unique */
  slug: string;
  tenant: string;

  /** Bağlamsal alanlar (v1 ile uyumlu) */
  city?: string;
  district?: string;
  zip?: string;

  /** Ek v2 alanları (opsiyonel) */
  codes?: {
    cityCode?: string;
    districtCode?: string;
    external?: Record<string, string>; // e-devlet, gis, vb.
  };
  geo?: { lat?: number; lng?: number };
  aliases?: string[];        // eski adlar / halk kullanımındaki adlar
  tags?: string[];           // arama/segment
  sortOrder?: number;        // listelerde sıralama

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
