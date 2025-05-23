// @/modules/bookingslot/bookingslot.model.ts

import mongoose, { Schema, Model, models } from "mongoose";

// 📌 Slot Rule: Weekly-based time logic (e.g., every Monday 09:00–23:00)
interface IBookingSlotRule extends Document {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "23:00"
  intervalMinutes: number; // e.g. 60 (appointment duration)
  breakBetweenAppointments: number; // e.g. 15 (in minutes)
  isActive: boolean;
}

// 📌 Slot Override: Specific date adjustments
interface IBookingSlotOverride extends Document {
  date: string; // ISO date: "2025-06-20"
  disabledTimes: string[]; // e.g. ["12:00", "13:00"]
  fullDayOff?: boolean;
}

// 🎯 Schema: Slot Rule
const bookingSlotRuleSchema = new Schema<IBookingSlotRule>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true }, // "HH:mm"
    endTime: { type: String, required: true },
    intervalMinutes: { type: Number, required: true, default: 60 },
    breakBetweenAppointments: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 🎯 Schema: Slot Override
const bookingSlotOverrideSchema = new Schema<IBookingSlotOverride>(
  {
    date: { type: String, required: true }, // ISO date format
    disabledTimes: [{ type: String }], // e.g. "14:00"
    fullDayOff: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 🛡️ Guarded Model Exports
const BookingSlotRule: Model<IBookingSlotRule> =
  models.BookingSlotRule || mongoose.model<IBookingSlotRule>("BookingSlotRule", bookingSlotRuleSchema);

const BookingSlotOverride: Model<IBookingSlotOverride> =
  models.BookingSlotOverride || mongoose.model<IBookingSlotOverride>("BookingSlotOverride", bookingSlotOverrideSchema);

export {
  BookingSlotRule,
  BookingSlotOverride,
};
