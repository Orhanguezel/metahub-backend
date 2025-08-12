import { Schema, Model, models, model } from "mongoose";
import type { INotification } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* Çoklu dil alanı (opsiyonel) */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

/* Alt şemalar */
const LinkSchema = new Schema(
  {
    href: String,
    routeName: String,
    params: { type: Object },
  },
  { _id: false }
);

const ActionSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: Object }, // TranslatedLabel
    link: { type: LinkSchema },
    method: { type: String, enum: ["GET", "POST"], default: "GET" },
    payload: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const TargetSchema = new Schema(
  {
    users: [{ type: Schema.Types.ObjectId, ref: "user" }],
    roles: [{ type: String }],
    employees: [{ type: Schema.Types.ObjectId, ref: "employee" }],
    allTenant: { type: Boolean, default: false },
  },
  { _id: false }
);

const DeliverySchema = new Schema(
  {
    channel: { type: String, enum: ["inapp","email","webhook","push","sms"], required: true },
    status:  { type: String, enum: ["pending","sent","failed"], default: "pending" },
    attempts:{ type: Number, default: 0 },
    lastError: String,
    sentAt: Date,
  },
  { _id: false }
);

const SourceSchema = new Schema(
  {
    module: { type: String, required: true },
    entity: String,
    refId: { type: Schema.Types.ObjectId },
    event: String,
  },
  { _id: false }
);

/* Ana şema */
const NotificationSchema = new Schema<INotification>(
  {
    tenant: { type: String, required: true, index: true },

    user: { type: Schema.Types.ObjectId, ref: "user", default: null, index: true },
    target: { type: TargetSchema },

    type: { type: String, enum: ["info","success","warning","error"], default: "info" },
    title: localizedStringField(),
    message: localizedStringField(),

    data: { type: Schema.Types.Mixed, default: null },

    link: { type: LinkSchema },
    actions: { type: [ActionSchema], default: [] },

    channels: { type: [String], enum: ["inapp","email","webhook","push","sms"], default: ["inapp"] },
    deliveries: { type: [DeliverySchema], default: [] },

    priority: { type: Number, min: 1, max: 5, default: 3 },

    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
    deliveredAt: Date,
    isActive: { type: Boolean, default: true, index: true },

    scheduleAt: { type: Date, index: true },
    notBefore: Date,

    // ❌ index: true KALDIRILDI
    expireAt: { type: Date }, // TTL index'i aşağıda tek yerden tanımlıyoruz

    dedupeKey: { type: String, index: true },
    dedupeWindowMin: { type: Number, min: 0, default: 0 },

    source: { type: SourceSchema },

    tags: [String],
  },
  { timestamps: true }
);

// ✅ TTL: tek tanım
NotificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// Diğer yardımcı indeksler aynı kalsın
NotificationSchema.index({ tenant: 1, user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ tenant: 1, "target.allTenant": 1, createdAt: -1 });
NotificationSchema.index({ tenant: 1, scheduleAt: 1, isActive: 1 });
NotificationSchema.index({ tenant: 1, dedupeKey: 1, createdAt: -1 });


/* Durumlara göre küçük yardımcılar (opsiyonel) */
NotificationSchema.pre("save", function(next) {
  // deliveredAt: herhangi bir kanal sent olduysa ilk zamanı ata
  if (this.isModified("deliveries") && Array.isArray(this.deliveries)) {
    const firstSent = this.deliveries.find(d => d.status === "sent" && d.sentAt);
    if (firstSent && !this.deliveredAt) this.deliveredAt = firstSent.sentAt!;
  }
  // isRead => readAt
  if (this.isModified("isRead") && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

export const Notification: Model<INotification> =
  models.notification || model<INotification>("notification", NotificationSchema);
