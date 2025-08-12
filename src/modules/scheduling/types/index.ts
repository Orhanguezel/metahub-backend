import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [K in SupportedLocale]?: string };

/** Oluşturulan işlerin kaynağı / bağlamı */
export interface IScheduleAnchor {
  apartmentRef: Types.ObjectId;          // zorunlu: hedef lokasyon
  categoryRef?: Types.ObjectId;          // ops: apartman kategorisi
  serviceRef?: Types.ObjectId;           // ops: üretilecek işin servisi
  templateRef?: Types.ObjectId;          // ops: adım/chec klist snapshot kaynağı
  contractRef?: Types.ObjectId;          // ops: sözleşme bağlamı
}

/** Plan iş üretim modu */
export type RecurrencePattern =
  | { type: "weekly"; every: number; daysOfWeek: number[] }                  // her N haftada, belirtilen günler
  | { type: "dayOfMonth"; every: number; day: number }                       // her N ayda, ayın X’i
  | { type: "nthWeekday"; every: number; nth: 1|2|3|4|5; weekday: 0|1|2|3|4|5|6 } // her N ayda, ayın 2. Salısı
  | { type: "yearly"; month: number; day: number };                          // yıllık özel gün

/** Gün içi zaman penceresi (yerel saat) */
export interface ITimeWindow {
  startTime?: string;                 // "09:00"
  endTime?: string;                   // "13:30"
  durationMinutes?: number;           // işin beklenen süresi (snapshot)
}

/** İş üretim stratejisi */
export interface IGenerationPolicy {
  leadTimeDays?: number;              // vade/günden bu kadar önce iş oluştur
  lockAheadPeriods?: number;          // X dönem ilerisini şimdiden üret
  autoAssign?: boolean;               // otomatik ekip atama denemesi (ileriye hazır)
  preferredEmployees?: Types.ObjectId[];
  minCrewSize?: number;
  maxCrewSize?: number;
}

/** Hariç tutulan gün/arası */
export interface IBlackoutRange {
  from: Date;
  to?: Date;                          // boşsa tek gün
  reason?: string;
}

/** Plan (recurrence) */
export interface ISchedulePlan {
  _id?: Types.ObjectId;

  tenant: string;                     // multi-tenant
  code: string;                       // SCH-YYYY-xxxxx (tenant+code unique)
  title?: TranslatedLabel;
  description?: TranslatedLabel;

  anchor: IScheduleAnchor;            // iş bağlamı
  timezone?: string;                  // "Europe/Istanbul" (default: tenant TZ)

  pattern: RecurrencePattern;         // tekrar kuralı
  window?: ITimeWindow;               // gün içi pencere & süre
  policy?: IGenerationPolicy;         // üretim politikası

  startDate: Date;                    // plan başlangıcı
  endDate?: Date;                     // opsiyonel bitiş
  skipDates?: Date[];                 // tekil istisna günleri
  blackouts?: IBlackoutRange[];       // aralık istisnaları

  lastRunAt?: Date;                   // planlayıcının en son çalıştığı an
  nextRunAt?: Date;                   // bir sonraki üretim kontrolü
  lastJobRef?: Types.ObjectId;        // en son üretilen job (ops)

  status: "active" | "paused" | "archived";
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}
