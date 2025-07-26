// src/modules/bookingslot/model.ts
// model.ts
import mongoose, { Schema, Model, models } from "mongoose";
import type { IBookingSlotRule, IBookingSlotOverride } from "./types";

const bookingSlotRuleSchema = new Schema<IBookingSlotRule>(
  {
    appliesToAll: { type: Boolean, default: false },
    tenant: { type: String, required: true, index: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: false },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    intervalMinutes: { type: Number, required: true, default: 60 },
    breakBetweenAppointments: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true },
    label: { type: Object, default: {} },
    description: { type: Object, default: {} },
  },
  { timestamps: true }
);

const bookingSlotOverrideSchema = new Schema<IBookingSlotOverride>(
  {
    date: { type: String, required: true },
    disabledTimes: [{ type: String }],
    fullDayOff: { type: Boolean, default: false },
    tenant: { type: String, required: true, index: true }, // Eklenmesi önerilir!
  },
  { timestamps: true }
);

const BookingSlotRule: Model<IBookingSlotRule> =
  models.bookingslotrule ||
  mongoose.model<IBookingSlotRule>("bookingslotrule", bookingSlotRuleSchema);

const BookingSlotOverride: Model<IBookingSlotOverride> =
  models.bookingslotoverride ||
  mongoose.model<IBookingSlotOverride>(
    "bookingslotoverride",
    bookingSlotOverrideSchema
  );

export { BookingSlotRule, BookingSlotOverride };
