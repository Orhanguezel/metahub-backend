import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [K in SupportedLocale]?: string };

export type JobStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";

export type JobSource =
  | "manual"       // kullanıcı elle oluşturdu
  | "recurrence"   // ops-templates.recurrence'dan üretildi
  | "contract"     // sözleşme kapsamı gereği oluştu
  | "adhoc";       // anlık/tek seferlik talep

export type StepType = "task" | "inspection" | "safety" | "handover";

/** Ekip ataması (işe atanan çalışanlar) */
export interface IJobAssignment {
  employeeRef: Types.ObjectId;            // ref: employee
  role?: "lead" | "member";
  plannedMinutes?: number;                // bu kişi için planlanan süre
  actualMinutes?: number;                 // time-tracking ile doldurulacak (snapshot)
  timeEntryRefs?: Types.ObjectId[];       // ref: timesheet (opsiyonel)
}

/** Kullanılan malzemeler (sarf/ekipman) */
export interface IMaterialUsage {
  itemRef?: Types.ObjectId;               // ref: inventoryitem (opsiyonel)
  sku?: string;                           // snapshot
  name?: TranslatedLabel;                 // snapshot
  quantity?: number;
  unit?: string;                          // "L","kg","pcs"...
  costPerUnit?: number;                   // TL/EUR
  currency?: string;                      // "TRY"/"EUR"
  totalCost?: number;                     // (quantity * cpu) hesap/snapshot
  chargeTo?: "expense" | "customer" | "internal";
}

/** Adım kontrol listesi sonucu */
export interface IChecklistResult {
  text?: TranslatedLabel;                 // snapshot
  required?: boolean;
  checked?: boolean;
  photoUrls?: string[];                   // kanıt fotoğrafları
  note?: string;
}

/** Kalite ölçümü sonucu (ör. boolean ya da numeric) */
export interface IQualityResult {
  key: string;                            // "bin_empty", "stair_dryness"
  label?: TranslatedLabel;                // snapshot
  type?: "boolean" | "number" | "select";
  value?: any;                            // gerçek ölçüm
  pass?: boolean;                         // geçti/kaldı
}

/** Template’teki adımın iş üzerindeki sonucu */
export interface IJobStepResult {
  stepCode?: string;
  title?: TranslatedLabel;                // snapshot
  instruction?: TranslatedLabel;          // snapshot
  type?: StepType;

  estimatedMinutes?: number;              // snapshot
  actualMinutes?: number;                 // adım bazlı gerçekleşen süre (ops)

  checklist?: IChecklistResult[];
  quality?: IQualityResult[];
  notes?: string;
  photos?: string[];                      // ek fotoğraflar
  completed?: boolean;
}

/** Teslimat/kanıt gereksinimleri (iş çıktıları) */
export interface IDeliverableResult {
  photos?: { before?: string[]; after?: string[] };
  signatures?: {
    customer?: { name?: string; byRef?: Types.ObjectId; at?: Date; imageUrl?: string };
    supervisor?: { name?: string; byRef?: Types.ObjectId; at?: Date; imageUrl?: string };
  };
  notes?: string;
  attachments?: { url: string; mime?: string; caption?: string }[];
}

/** Finansal snapshot (faturalama bağı) */
export interface IJobFinance {
  billable?: boolean;                     // faturalandırılacak mı
  revenueAmountSnapshot?: number;         // işin getirisi (satır bazlı)
  revenueCurrency?: string;               // "EUR","TRY"
  laborCostSnapshot?: number;             // işçilik maliyeti (ops)
  materialCostSnapshot?: number;          // malzeme maliyeti (ops)
  invoiceRef?: Types.ObjectId;            // ref: invoice (ops)
  invoiceLineId?: string;                 // satır id (ops)
}

/** Zaman pencereleri */
export interface IJobSchedule {
  plannedStart?: Date;
  plannedEnd?: Date;
  dueAt?: Date;                           // SLA/son teslim
  startedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

/** İş emri */
export interface IOperationJob {
  _id?: Types.ObjectId;

  tenant: string;                         // multi-tenant
  code: string;                           // JOB-YYYY-xxxxx (tenant+code unique)
  title?: TranslatedLabel;                // görünen ad
  description?: TranslatedLabel;

  source: JobSource;                      // manuel/sözleşme/tekrarlı/adhoc
  templateRef?: Types.ObjectId;           // ref: operationtemplate
  serviceRef?: Types.ObjectId;            // ref: service
  contractRef?: Types.ObjectId;           // ref: contract (varsa)

  apartmentRef: Types.ObjectId;           // ref: apartment
  categoryRef?: Types.ObjectId;           // ref: apartmentcategory

  status: JobStatus;

  schedule: IJobSchedule;
  expectedDurationMinutes?: number;       // plan/snapshot
  actualDurationMinutes?: number;         // gerçekleşen toplam (autofill)
  onTime?: boolean;                       // dueAt karşılanabildi mi

  assignments: IJobAssignment[];          // ekip
  steps: IJobStepResult[];                // adım sonuçları
  materials?: IMaterialUsage[];           // kullanılan malzemeler
  deliverables?: IDeliverableResult;      // foto/imza/ekler

  finance?: IJobFinance;                  // finans snapshotları

  priority?: "low" | "normal" | "high" | "critical";
  tags?: string[];

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
