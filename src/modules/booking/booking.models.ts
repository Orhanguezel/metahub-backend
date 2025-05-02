import mongoose, { Schema, Document, Types, Model, models } from "mongoose";

interface IBooking extends Document {
  user?: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  serviceType: string;
  note?: string;
  date: string;
  time: string;
  service: Types.ObjectId;
  durationMinutes: number;
  status: "pending" | "confirmed" | "cancelled";
  language: "tr" | "en" | "de";
  createdAt?: Date;
  updatedAt?: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, match: [/.+@.+\..+/, "Invalid email"] },
    phone: { type: String, trim: true },
    serviceType: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    durationMinutes: { type: Number, default: 60 },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    language: { type: String, enum: ["tr", "en", "de"], default: "en" },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type
const Booking: Model<IBooking> =
  models.Booking || mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;
export { Booking, IBooking };
