import { Types, Document } from "mongoose";
import type { SupportedLocale } from "@/types/common"; // Merkezi dil tipi

export interface IBooking extends Document {
  user?: Types.ObjectId;
  name: string;
  tenant: string; // Optional tenant field for multi-tenancy
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
  language: SupportedLocale;
  confirmedAt?: Date;
  confirmedBy?: Types.ObjectId;
  isNotified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
