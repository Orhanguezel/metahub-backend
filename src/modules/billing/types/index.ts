import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export type BillingPeriod = "weekly" | "monthly" | "quarterly" | "yearly";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Pazar=0

/** Vade kuralı: planın o döneme ait vadesini hesaplamaya yarar */
export type DueRule =
  | { type: "dayOfMonth"; day: number }                        // Ayın 1,5,10,15… günü
  | { type: "nthWeekday"; nth: 1 | 2 | 3 | 4 | 5; weekday: Weekday }; // "ayın 2. Salısı"

/** Plan kaynağı: hangi sözleşmeden/hatdan türedi? */
export interface IBillingPlanSource {
  contract: Types.ObjectId;               // ref: "contract"
  contractLine?: Types.ObjectId;          // ref: contract.lines[*] (mode=perLine)
  mode: "fixed" | "perLine";              // sözleşmedeki billing.mode ile uyumlu
  snapshots?: {
    contractCode?: string;                // hızlı listeleme için
    apartment?: Types.ObjectId;           // ref: "apartment"
    customer?: Types.ObjectId;            // ref: "customer"
    service?: Types.ObjectId;             // perLine ise ilgili servis
    title?: TranslatedLabel;              // kısa başlık
  };
}

/** Planın fiyat ve periyod bilgisi (fatura üretimi için temel) */
export interface IBillingPlanSchedule {
  amount: number;                         // mode=fixed: sabit tutar; perLine: satır tutarı
  currency: string;                       // "EUR","TRY"…
  period: BillingPeriod;                  // weekly|monthly|quarterly|yearly
  dueRule: DueRule;                       // vade kuralı
  startDate: Date;                        // plan yürürlük başlangıcı
  endDate?: Date;                         // opsiyonel bitiş
  graceDays?: number;                     // gecikme toleransı (gün)
}

export type BillingPlanStatus = "draft" | "active" | "paused" | "ended";

/** Ana plan dokümanı */
export interface IBillingPlan {
  _id?: Types.ObjectId;

  tenant: string;                         // multi-tenant
  code: string;                           // insan okunur tekil kod (tenant+code unique)

  source: IBillingPlanSource;             // sözleşme ilişkisi
  schedule: IBillingPlanSchedule;         // tutar/periyot/vade

  // çalışma durumları
  status: BillingPlanStatus;              // draft/active/paused/ended
  lastRunAt?: Date;                       // en son occurrence üretimi tarihi
  nextDueAt?: Date;                       // bir sonraki beklenen vade (hızlı tarama için)

  // notlar ve fiyat revizyon geçmişi (opsiyonel)
  notes?: TranslatedLabel;
  revisions?: Array<{
    validFrom: Date;
    amount?: number;
    currency?: string;
    reason?: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

/** Plandan türeyen tekil “tahsilat olayı” (invoicing buradan fatura keser) */
export type BillingOccurrenceStatus = "pending" | "invoiced" | "skipped" | "canceled";

export interface IBillingOccurrence {
  _id?: Types.ObjectId;

  tenant: string;
  plan: Types.ObjectId;                   // ref: "billingplan"
  seq: number;                            // plan bazında artan sıra no (1,2,3…)
  windowStart: Date;                      // dönemin başlangıcı (örn. 2025-03-01)
  windowEnd: Date;                        // dönemin bitişi    (örn. 2025-03-31)
  dueAt: Date;                            // vade
  amount: number;                         // kilitlenen tutar
  currency: string;

  status: BillingOccurrenceStatus;        // pending|invoiced|skipped|canceled
  invoice?: Types.ObjectId;               // ref: "invoice" (invoicing modülü set eder)
  notes?: TranslatedLabel;

  createdAt: Date;
  updatedAt: Date;
}
