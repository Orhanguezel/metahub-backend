import type { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [K in SupportedLocale]?: string };

/** GeoJSON Point */
export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

/** İletişim bilgileri */
export interface IContactInfo {
  phone?: string;
  email?: string;
  addressLine?: string;
  city?: string;
  zip?: string;
  country?: string; // ISO-2
}

/** Acil durum kişisi */
export interface IEmergencyContact {
  name: string;
  phone?: string;
  relation?: string;
}

/** Dil becerileri */
export interface ILanguageSkill {
  code: string; // "tr", "de", "en"...
  level: "basic" | "conversational" | "fluent" | "native";
}

/** Yetenek / Skill */
export interface ISkill {
  key: string;                    // "stair_cleaning", "waste_pickup"...
  label?: TranslatedLabel;        // i18n isim
  level?: 1 | 2 | 3 | 4 | 5;      // 1..5
  serviceRef?: Types.ObjectId;    // ops: service ile ilişkilendir
  expiresAt?: Date;               // ops: geçerlilik süresi
  certified?: boolean;            // ops: belgeye bağlı mı
}

/** Sertifika/Doküman */
export interface ICertification {
  name: string;
  issuer?: string;
  idNumber?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  attachmentRef?: Types.ObjectId; // ops: files/docs modülü
}

/** Haftalık düzenli uygunluk (yerel saat) */
export interface IWeeklyWindow {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Pazar=0
  startTime: string;                  // "09:00"
  endTime: string;                    // "17:00"
}

/** Özel gün uygunluk/istisna */
export interface ISpecialDayWindow {
  date: Date;                         // yalnızca bu gün
  windows?: Array<{ startTime: string; endTime: string }>;
  isUnavailable?: boolean;            // tüm gün kapalı
  reason?: string;
}

/** İzin / devamsızlık */
export interface ILeaveEntry {
  kind: "vacation" | "sick" | "unpaid" | "other";
  from: Date;
  to: Date;
  note?: string;
}

/** Planlama kısıtları */
export interface ISchedulingConstraints {
  maxDailyMinutes?: number;
  maxWeeklyMinutes?: number;
  maxMonthlyMinutes?: number;
  minRestHoursBetweenShifts?: number; // örn. 11
  maxConsecutiveDays?: number;
  preferredServices?: Types.ObjectId[]; // tercihen atanacağı servisler
  avoidServices?: Types.ObjectId[];     // atanmasını istemediklerin
}

/** Ücret kartları (maliyet & faturalama) */
export interface IRateCard {
  kind: "standard" | "overtime" | "weekend" | "holiday" | "service";
  serviceRef?: Types.ObjectId;      // kind==="service" ise zorunlu
  currency: string;                 // "EUR", "TRY"...
  payRate?: number;                 // iç maliyet (saatlik)
  billRate?: number;                // müşteriye fatura (saatlik)
  validFrom: Date;
  validTo?: Date;
}

/** İstihdam / çalışma bilgisi */
export interface IEmployment {
  type: "fulltime" | "parttime" | "contractor" | "intern";
  position?: string;
  startDate: Date;
  endDate?: Date;
  managerRef?: Types.ObjectId;      // başka bir employee’a referans
  teamRefs?: Types.ObjectId[];      // ileride teams modülü için
}

/** Çalışan ana kaydı */
export interface IEmployee {
  _id?: Types.ObjectId;

  tenant: string;                   // multi-tenant
  code: string;                     // EMP-YYYY-xxxxx (tenant+code unique)
  userRef?: Types.ObjectId;         // ops: auth kullanıcı bağlantısı

  firstName: string;
  lastName: string;
  fullName?: string;                // otomatik türetilecek
  displayName?: string;             // kartlarda gösterim adı (ops)
  photoUrl?: string;

  contact?: IContactInfo;
  emergency?: IEmergencyContact;

  languages?: ILanguageSkill[];
  skills?: ISkill[];
  certifications?: ICertification[];

  employment: IEmployment;

  homeBase?: IGeoPoint;             // başlangıç noktası (rota/saha)
  timezone?: string;                // "Europe/Istanbul"

  weeklyAvailability?: IWeeklyWindow[];     // düzenli uygunluk
  specialDays?: ISpecialDayWindow[];        // tekil gün istisnaları
  leaves?: ILeaveEntry[];                   // izin/rapor
  constraints?: ISchedulingConstraints;

  rateCards?: IRateCard[];                  // maliyet/fiyatlandırma
  currentCostPerHour?: number;              // hızlı erişim için opsiyonel özet
  currentBillPerHour?: number;              // opsiyonel özet

  status: "active" | "inactive" | "onleave" | "terminated";
  notes?: TranslatedLabel;
  tags?: string[];

  nextAvailableAt?: Date;                   // scheduler hesaplar

  createdAt: Date;
  updatedAt: Date;
}
