import type { Types } from "mongoose";

/** Basit dosya varlığı (export çıktıları için) */
export interface IFileAsset {
  url: string;
  name?: string;
  mime?: string;
  size?: number;      // bytes
  publicId?: string;  // CDN/Cloud id
}

/** Tarih aralığı filtresi + preset */
export type DatePreset =
  | "today" | "yesterday"
  | "this_week" | "last_week"
  | "this_month" | "last_month"
  | "this_quarter" | "last_quarter"
  | "this_year" | "last_year"
  | "custom";

export interface IDateRange {
  preset?: DatePreset;
  from?: Date;       // preset=custom olduğunda
  to?: Date;         // preset=custom olduğunda
  timezone?: string; // "Europe/Berlin" vb.
}

/** Rapor türleri (iş/içerik alanlarına göre) */
export type ReportKind =
  | "ar_aging"             // alacak yaşlandırma (invoices->payments)
  | "ap_aging"             // borç yaşlandırma (expenses->payments)
  | "revenue"              // faturalandırılmış gelir
  | "expense"              // giderler
  | "cashflow"             // nakit giriş/çıkış (ödemeler bazlı)
  | "profitability"        // kârlılık (gelir - gider) / apartment / service
  | "billing_forecast"     // yaklaşan tahsilatlar (billing)
  | "invoice_collections"  // tahsilat performansı
  | "employee_utilization" // personel doluluk / zaman kullanımı
  | "workload"             // iş yükü (planlanan saat vs kapasite)
  | "service_performance" // servis SLA / tamamlama
  // v2 (Faz-2) eklenenler:
  | "hourly_sales"           // saatlik satış ısı haritası
  | "coupon_performance"     // kupon kullanımı & etki
  | "order_cancellations"    // iptal nedenleri dağılımı
  | "profitability_kpi"      // kategori/ürün kârlılık (opsiyonel tanım)
  | "on_time_rate";          // zamanında teslim/pickup oranı (opsiyonel tanım)

/** Rapor varsayılan filtreleri */
export interface IReportFilters {
  date?: IDateRange;
  currency?: string;

  apartmentIds?: Types.ObjectId[];
  categoryIds?: Types.ObjectId[];
  serviceIds?: Types.ObjectId[];
  employeeIds?: Types.ObjectId[];
  vendorIds?: Types.ObjectId[];
  contractIds?: Types.ObjectId[];
  jobIds?: Types.ObjectId[];

  status?: string[];   // invoice/expense/job durumları vb.
  tags?: string[];
  // ileride: free-form kriterler için:
  extra?: Record<string, any>;
}

/** Zamanlama (light cron) */
export type ScheduleFreq = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "cron";

export interface IReportSchedule {
  isEnabled: boolean;
  frequency: ScheduleFreq;
  timezone?: string;          // "Europe/Istanbul"
  timeOfDay?: string;         // "09:00" (HH:mm)
  dayOfWeek?: 0|1|2|3|4|5|6;  // weekly için
  dayOfMonth?: number;        // 1..31 (monthly için)
  cron?: string;              // gelişmiş kullanım için (örn: "0 9 * * MON")
  lastRunAt?: Date;
  nextRunAt?: Date;
  recipients?: Array<{
    channel: "email" | "webhook";
    target: string;           // e-mail ya da webhook URL
    format?: "csv" | "xlsx" | "pdf" | "json";
  }>;
}

/** Şablon (kullanıcı tarafından kaydedilmiş rapor tanımı) */
export interface IReportDefinition {
  _id?: Types.ObjectId;

  tenant: string;
  code?: string;              // REP-YYYY-xxxxxx (otomatik)
  name: string;
  kind: ReportKind;
  description?: string;

  defaultFilters?: IReportFilters;

  // Görünüm/çıktı tercihleri
  view?: {
    type?: "table" | "pivot" | "chart";
    chart?: { type?: "line"|"bar"|"pie"; x?: string; y?: string[] };
    columns?: string[];       // tabloda gösterilecek alanlar
    groupBy?: string[];       // pivota hazırlık
  };

  exportFormats?: Array<"csv"|"xlsx"|"pdf"|"json">;

  schedule?: IReportSchedule;
  isActive: boolean;
  tags?: string[];

  createdByRef?: Types.ObjectId; // ref: user
  updatedByRef?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/** Çalıştırma kaydı (log) */
export type RunStatus = "queued" | "running" | "success" | "error" | "cancelled";

export interface IReportRun {
  _id?: Types.ObjectId;

  tenant: string;
  definitionRef?: Types.ObjectId; // ref: reportdefinition
  kind: ReportKind;               // snapshot; definition silinirse iz kalsın
  code?: string;                  // RUN-YYYY-xxxxxx (otomatik)
  triggeredBy?: "manual" | "schedule" | "api";
  startedAt?: Date;
  finishedAt?: Date;
  status: RunStatus;
  durationMs?: number;

  // O çalıştırmada kullanılan filtreler (definition default + override)
  filtersUsed?: IReportFilters;

  // Çıktı meta
  rowCount?: number;
  bytes?: number;
  files?: IFileAsset[];          // export dosyaları (csv/xlsx/pdf/json)
  previewSample?: any[];         // küçük örnek (ilk 20 satır gibi)

  error?: string;

  createdAt: Date;
  updatedAt: Date;
}
