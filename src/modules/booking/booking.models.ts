import mongoose, { Schema, Model, models } from "mongoose";
import type { IBooking } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

const bookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true }, // Artık string
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Invalid email"],
    },
    phone: { type: String, trim: true },
    serviceType: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    service: { type: Schema.Types.ObjectId, ref: "Services", required: true },
    slotRef: { type: Schema.Types.ObjectId, ref: "BookingSlot" },
    durationMinutes: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    language: {
          type: String,
          enum: SUPPORTED_LOCALES,
          default: "en",
        },
    confirmedAt: { type: Date },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isNotified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Booking: Model<IBooking> =
  models.Booking || mongoose.model<IBooking>("Booking", bookingSchema);

export { Booking };
