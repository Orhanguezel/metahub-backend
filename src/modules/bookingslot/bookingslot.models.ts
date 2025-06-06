import mongoose, { Schema, Model, models, Document } from "mongoose";

/**
 * Slot Rule: Haftalık tek bir genel çalışma kuralı tanımlayabilirsin.
 * appliesToAll: true ise tüm günlere uygulanır (varsayılan kural).
 * dayOfWeek: Spesifik gün (0 = Pazar, 6 = Cumartesi). 
 * İkisi birlikte varsa: dayOfWeek önceliklidir (override mantığı).
 */
export interface IBookingSlotRule extends Document {
  appliesToAll?: boolean;              // true: tüm günler için geçerli (default weekly rule)
  dayOfWeek?: number;                  // 0 = Sunday, 6 = Saturday (opsiyonel)
  startTime: string;                   // e.g. "09:00"
  endTime: string;                     // e.g. "23:00"
  intervalMinutes: number;             // randevu süresi (örn: 60)
  breakBetweenAppointments: number;    // aradaki boşluk (örn: 15)
  isActive: boolean;
}

export interface IBookingSlotOverride extends Document {
  date: string;           // "2025-06-20"
  disabledTimes: string[];// ["12:00", "13:00"]
  fullDayOff?: boolean;   // O gün tamamen kapalı mı?
}

// 🎯 Slot Rule Schema
const bookingSlotRuleSchema = new Schema<IBookingSlotRule>(
  {
    appliesToAll: { type: Boolean, default: false },            // Tüm günlere mi?
    dayOfWeek: { type: Number, min: 0, max: 6, required: false }, // Sadece belirli bir gün için mi?
    startTime: { type: String, required: true },  // "HH:mm"
    endTime: { type: String, required: true },
    intervalMinutes: { type: Number, required: true, default: 60 },
    breakBetweenAppointments: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 🎯 Slot Override Schema
const bookingSlotOverrideSchema = new Schema<IBookingSlotOverride>(
  {
    date: { type: String, required: true },      // ISO date
    disabledTimes: [{ type: String }],           // ["14:00", ...]
    fullDayOff: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// 🛡️ Models
const BookingSlotRule: Model<IBookingSlotRule> =
  models.BookingSlotRule || mongoose.model<IBookingSlotRule>("BookingSlotRule", bookingSlotRuleSchema);

const BookingSlotOverride: Model<IBookingSlotOverride> =
  models.BookingSlotOverride || mongoose.model<IBookingSlotOverride>("BookingSlotOverride", bookingSlotOverrideSchema);

export {
  BookingSlotRule,
  BookingSlotOverride,
};
