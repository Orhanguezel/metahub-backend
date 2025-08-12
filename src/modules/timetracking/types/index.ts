import type { Types } from "mongoose";

/** GeoJSON Point */
export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

/** Cihaz / istemci izi (opsiyonel) */
export interface IDeviceInfo {
  kind?: "web" | "mobile" | "kiosk" | "api";
  deviceId?: string;
  platform?: string;     // "iOS 17", "Android 14", "Windows 11"
  appVersion?: string;   // "1.4.0"
  userAgent?: string;
}

/** Mola kaydı */
export interface IBreakEntry {
  start: Date;
  end?: Date;            // açık mola "end" yoksa dakika hesaplanmaz
  paid?: boolean;        // ücretli mola mı?
  reason?: string;
  minutes?: number;      // ops: manuel dakika (start/end yoksa)
}

/** Onay akışı (çok aşamalı onay için dizi) */
export interface IApproval {
  status: "pending" | "approved" | "rejected";
  approverRef?: Types.ObjectId;   // ref: user/employee
  note?: string;
  at?: Date;
  stage?: "supervisor" | "payroll" | "custom";
}

/** Yuvarlama kuralı (opsiyonel) */
export interface IRoundingRule {
  roundToMinutes: number;         // 5, 10, 15...
  strategy: "nearest" | "up" | "down";
  applyTo?: "total";              // şimdilik total bazında uygula
}

/** Ücret kodu / bordro sınıflaması */
export interface IPayCode {
  kind: "regular" | "overtime" | "holiday" | "sick" | "vacation" | "other";
  billable?: boolean;             // müşteriden faturalansın mı?
}

/** Zaman girişi (atomik) */
export interface ITimeEntry {
  _id?: Types.ObjectId;

  tenant: string;                     // multi-tenant
  code?: string;                      // TE-YYYY-xxxxxx (otomatik)
  employeeRef: Types.ObjectId;        // ref: employee (zorunlu)
  jobRef?: Types.ObjectId;            // ref: operations-jobs
  shiftRef?: Types.ObjectId;          // ref: scheduling (opsiyonel)
  serviceRef?: Types.ObjectId;        // ref: service (opsiyonel)
  apartmentRef?: Types.ObjectId;      // ref: apartment (raporlama için hızlı erişim)

  date: Date;                         // çalışma günü (yerel)
  clockInAt?: Date;
  clockOutAt?: Date;

  geoIn?: IGeoPoint;
  geoOut?: IGeoPoint;
  deviceIn?: IDeviceInfo;
  deviceOut?: IDeviceInfo;

  breaks?: IBreakEntry[];             // molalar
  notes?: string;

  payCode?: IPayCode;
  rounding?: IRoundingRule;

  // Anlık oran snapshotları (saatlik)
  costRateSnapshot?: number;          // iç maliyet
  billRateSnapshot?: number;          // müşteriye fatura

  // Hesaplananlar (dakika)
  minutesWorked?: number;             // (out-in) - unpaid breaks (rounded)
  minutesBreaks?: number;             // toplam mola dk (paid+unpaid)
  minutesPaid?: number;               // minutesWorked + paid breaks
  overtimeMinutes?: number;           // opsiyonel (ileride kuralla hesaplanır)

  // Tutarlar (rate * dakika/60)
  costAmount?: number;
  billAmount?: number;

  // Durum / yaşam döngüsü
  status: "open" | "submitted" | "approved" | "rejected" | "locked" | "exported";
  approvals?: IApproval[];

  // Dışa aktarım / entegrasyon
  exportBatchId?: string;             // aynı batch ile işaretleme

  // Kaynağı
  source?: "manual" | "mobile" | "kiosk" | "import" | "system";

  createdAt: Date;
  updatedAt: Date;
}
