// types/newsletter.types.ts
import type { SupportedLocale } from "@/types/common";

export interface INewsletter {
  tenant: string; // Multi-tenancy (zorunlu)
  email: string;
  verified: boolean;         // Double opt-in (mail onaylandı mı)
  subscribeDate: Date;
  unsubscribeDate?: Date;
  lang?: SupportedLocale;    // Kullanıcının tercih ettiği dil
  meta?: any;                // Ekstra (segment, referans, vs)
}
