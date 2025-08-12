import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

/** Çoklu dil */
export type TranslatedLabel = Partial<Record<SupportedLocale, string>>;

/** Gönderim kanalları */
export type NotificationChannel = "inapp" | "email" | "webhook" | "push" | "sms";

/** Bildirim hedeflemesi */
export interface INotificationTarget {
  users?: Types.ObjectId[];       // spesifik kullanıcılar
  roles?: string[];               // örn: ["admin","operator"]
  employees?: Types.ObjectId[];   // çalışanlara
  allTenant?: boolean;            // tenant genel yayını
}

/** Kaynak (hangi modül/entiteden tetiklendi) */
export interface INotificationSource {
  module: string;                 // "invoicing","payments","scheduling"...
  entity?: string;                // "invoice","payment","job"...
  refId?: Types.ObjectId;         // o entitenin _id'si
  event?: string;                 // "invoice.overdue","job.assigned"...
}

/** Tıklama / CTA bilgisi */
export interface INotificationLink {
  href?: string;                  // mutlak/nispi URL
  routeName?: string;             // app içi route adı (opsiyonel)
  params?: Record<string, string | number>;
}

export interface INotificationAction {
  key: string;                    // "open","pay","viewJob"...
  label: TranslatedLabel;
  link?: INotificationLink;
  method?: "GET" | "POST";
  payload?: any;                  // yönteme özel ek veri
}

/** Kanal bazlı teslimat log’u (basit) */
export type DeliveryStatus = "pending" | "sent" | "failed";

export interface INotificationDelivery {
  channel: NotificationChannel;
  status: DeliveryStatus;
  attempts: number;
  lastError?: string;
  sentAt?: Date;
}

/** Ana bildirim kaydı */
export interface INotification {
  _id?: Types.ObjectId;

  tenant: string;                 // zorunlu
  user?: Types.ObjectId | null;   // bireysel bildirim (varsa)
  // Yeni hedefleme modeli (opsiyonel, user ile birlikte de olabilir)
  target?: INotificationTarget;

  type: "info" | "success" | "warning" | "error";
  title: TranslatedLabel;
  message: TranslatedLabel;

  data?: any;                     // extra payload (future-proof)
  link?: INotificationLink;
  actions?: INotificationAction[];

  channels?: NotificationChannel[];         // varsayılan: ["inapp"]
  deliveries?: INotificationDelivery[];     // kanal bazlı durum

  priority?: 1 | 2 | 3 | 4 | 5;            // 5=kritik
  isRead: boolean;
  readAt?: Date;
  deliveredAt?: Date;                      // ilk başarılı kanal zamanı
  isActive: boolean;

  // Zamanlama / ömür
  scheduleAt?: Date;                       // planlı gönderim
  notBefore?: Date;                        // bundan önce göstermeyin
  expireAt?: Date;                         // TTL index için

  // Tekrarlama kontrolü
  dedupeKey?: string;                      // aynı olayı grupla
  dedupeWindowMin?: number;                // dk cinsinden bastırma penceresi

  // Kaynak bilgisi
  source?: INotificationSource;

  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}
