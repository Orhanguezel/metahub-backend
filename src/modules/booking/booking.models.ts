import mongoose, { Schema, Types, Model, models } from "mongoose";

export interface IBooking extends Document {
  user?: Types.ObjectId;
  name: {
    tr: string;
    en: string;
    de: string;
  };
  email: string;
  phone?: string;
  serviceType: string;
  note?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  service: Types.ObjectId;
  slotRef?: Types.ObjectId;
  durationMinutes: number;
  status: "pending" | "confirmed" | "cancelled";
  language: "tr" | "en" | "de";
  confirmedAt?: Date;
  confirmedBy?: Types.ObjectId;
  isNotified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },

    name: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },

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

    service: {
      type: Schema.Types.ObjectId,
      ref: "Services",
      required: true,
    },

    slotRef: { type: Schema.Types.ObjectId, ref: "BookingSlot" }, // yeni slot referansı

    durationMinutes: { type: Number, default: 60 },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },

    language: {
      type: String,
      enum: ["tr", "en", "de"],
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
