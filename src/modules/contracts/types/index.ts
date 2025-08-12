import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export type PeriodUnit = "day" | "week" | "month";
export type BillingPeriod = "weekly" | "monthly" | "quarterly" | "yearly";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Pazar=0

/** Vade kuralı (faturalama planı üreticisi kullanır) */
export type DueRule =
  | { type: "dayOfMonth"; day: number }                 // Ayın 1,5,10,15… günü
  | { type: "nthWeekday"; nth: 1 | 2 | 3 | 4 | 5; weekday: Weekday }; // "ayın 2. Salısı"

/** Sözleşme tarafları */
export interface IContractParties {
  apartment: Types.ObjectId;        // ref: "apartment" (ürün)
  customer?: Types.ObjectId;        // ref: "customer" (ops.)
  contactSnapshot?: {
    name: string;
    phone?: string;
    email?: string;
    role?: string;
  };
}

/** Satır: Hizmet / kapsam / plan & adam-saat */
export interface IContractLine {
  service: Types.ObjectId;          // ref: "servicecatalog" (zorunlu)
  name?: TranslatedLabel;           // snapshot (i18n)
  description?: TranslatedLabel;

  // ücret: sözleşme toplamına dahil ya da satır bazlı olabilir
  isIncludedInContractPrice?: boolean;
  unitPrice?: number;               // satır bazlı faturalama seçeneği için
  currency?: string;                // varsayılan "EUR"/"TRY" vs.

  // operasyonel plan (operations-templates/jobs bunu kullanır)
  schedule?: {
    every: number;                  // 1,2,3…
    unit: PeriodUnit;               // day|week|month
    daysOfWeek?: Weekday[];         // haftalık ise: [1,3,5] gibi
    exceptions?: Weekday[];         // örn. [0] = Pazar hariç
  };

  manpower?: {
    headcount: number;              // aynı anda çalışan kişi
    durationMinutes: number;        // tek görev süresi (adam-dakika)
  };

  isActive: boolean;
  notes?: TranslatedLabel;
}

/** Sözleşme genel faturalama koşulları (plan üretici buradan okur) */
export interface IContractBilling {
  mode: "fixed" | "perLine";        // fixed: tek tutar, perLine: satır toplamı
  amount?: number;                  // mode=fixed ise zorunlu
  currency: string;                 // "EUR","TRY"…
  period: BillingPeriod;            // weekly|monthly|quarterly|yearly
  dueRule: DueRule;                 // vade kuralı
  startDate: Date;                  // yürürlük başlangıcı
  endDate?: Date;                   // opsiyonel bitiş
  graceDays?: number;               // gecikmeye tolerans

  revisions?: Array<{
    validFrom: Date;
    amount?: number;                // amount değişimi (mode=fixed için)
    currency?: string;
    reason?: string;
  }>;
}

/** Sözleşme durumu/ömür döngüsü */
export type ContractStatus = "draft" | "active" | "suspended" | "terminated" | "expired";

/** Contract kök tip */
export interface IContract {
  _id?: Types.ObjectId;

  tenant: string;                   // multi-tenant
  code: string;                     // insan okunur tekil numara (tenant+code unique)
  title?: TranslatedLabel;          // kısa başlık
  description?: TranslatedLabel;

  parties: IContractParties;
  lines: IContractLine[];
  billing: IContractBilling;

  status: ContractStatus;
  activatedAt?: Date;
  terminatedAt?: Date;
  reasonNote?: string;

  isActive: boolean;                // pratik filtre (status !== terminated/expired)
  createdAt: Date;
  updatedAt: Date;
}
