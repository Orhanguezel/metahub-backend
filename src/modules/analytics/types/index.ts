import type { SupportedLocale } from "@/types/common"; // Merkezi dil tipi
import mongoose from "mongoose";

export interface IAnalyticsLog {
  userId?: mongoose.Types.ObjectId | string | null;
  module: string;
  eventType: string;
  path?: string;
  method?: string;
  ip?: string;
  country?: string;
  city?: string;
  location?: { type: "Point"; coordinates: [number, number] } | { lat: number; lon: number };
  userAgent?: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  status?: number;
  message?: string;
  meta?: Record<string, any>;
  uploadedFiles?: string[];
  language: SupportedLocale;

  timestamp?: Date;
}
