import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export type StepType = "task" | "inspection" | "safety" | "handover";

export interface ICrewRequirement {
  min?: number;          // örn. 1
  max?: number;          // örn. 3
  recommended?: number;  // örn. 2
}

export interface IChecklistItem {
  text: TranslatedLabel;
  required?: boolean;       // iş tamamlanmadan işaret zorunluluğu
  photoRequired?: boolean;  // foto zorunlu mu
  minPhotos?: number;       // minimum foto adedi
  geoCheck?: boolean;       // konum doğrulama
}

export interface IQualityCheck {
  key: string;               // "stair_dryness", "bin_empty" vb.
  label?: TranslatedLabel;
  type?: "boolean" | "number" | "select";
  passIf?: any;              // hedef/limit (ör. boolean true, number <= 3 vb.)
  options?: string[];        // select için
  required?: boolean;
}

export interface IMaterialRequirement {
  itemRef?: Types.ObjectId;  // ref: inventoryItem (ileride)
  sku?: string;              // snapshot
  name?: TranslatedLabel;    // snapshot (i18n)
  quantity?: number;
  unit?: string;             // "L","kg","pcs"...
  chargeTo?: "expense" | "customer" | "internal";
}

export interface IOperationStep {
  code?: string;                   // adım kısa kodu
  title: TranslatedLabel;
  instruction?: TranslatedLabel;   // adım yönergesi
  type?: StepType;
  estimatedMinutes?: number;
  requiredSkills?: string[];       // "janitor","window_clean" gibi etiketler
  requiredEquipment?: string[];    // "mop","vacuum"...
  checklist?: IChecklistItem[];
  quality?: IQualityCheck[];
}

export interface IDeliverableRequirements {
  photos?: { before?: boolean; after?: boolean; minPerStep?: number };
  signatures?: { customer?: boolean; supervisor?: boolean };
  notesRequired?: boolean;
  attachmentsRequired?: boolean;
}

export type RecurrenceUnit = "day" | "week" | "month";
export interface IRecurrenceTemplate {
  enabled?: boolean;          // şablon üzerinden varsayılan periyot
  every?: number;             // 1,2,3...
  unit?: RecurrenceUnit;      // day|week|month
  daysOfWeek?: number[];      // 0..6 (haftalık ise)
  dayOfMonth?: number;        // aylık: 1..31
  nthWeekday?: { nth: 1|2|3|4|5; weekday: 0|1|2|3|4|5|6 }; // “ayın 2. Salısı”
  startDateHint?: Date;       // opsiyonel başlangıç önerisi
}

export interface IApplicability {
  categoryRefs?: Types.ObjectId[];   // ref: apartmentcategory
  apartmentRefs?: Types.ObjectId[];  // (opsiyonel sabitleme)
  tags?: string[];                   // etiket tabanlı hedefleme
}

export interface IOperationTemplate {
  _id?: Types.ObjectId;

  tenant: string;                       // multi-tenant
  code: string;                         // OPT-YYYY-xxxxx (tenant+code unique)
  name: TranslatedLabel;
  description?: TranslatedLabel;

  serviceRef?: Types.ObjectId;          // ref: service (varsa)
  defaultDurationMinutes?: number;      // toplam tahmini süre
  crew?: ICrewRequirement;

  steps: IOperationStep[];              // operasyon adımları
  materials?: IMaterialRequirement[];   // sarf/ekipman gereksinimi
  safetyNotes?: TranslatedLabel[];      // İSG notları

  deliverables?: IDeliverableRequirements;

  recurrence?: IRecurrenceTemplate;     // plan üretirken varsayılan
  applicability?: IApplicability;       // hangi kategoriler/apartmanlar

  tags?: string[];                      // serbest etiketler
  version?: number;                     // 1,2,3...
  isActive: boolean;                    // kullanımda mı
  deprecatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
