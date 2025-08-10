import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

// --- Category (name aynen kalsın: apartmentcategory) ---
export interface IApartmentCategory {
  _id?: Types.ObjectId;
  name: { [key in SupportedLocale]: string };
  slug: string;                      // unique per tenant
  tenant: string;
  city?: string;
  district?: string;
  zip?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}