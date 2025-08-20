// src/modules/analytics/types.ts
import type { SupportedLocale } from "@/types/common";
import mongoose from "mongoose";

export interface IAnalyticsLog {
  userId?: mongoose.Types.ObjectId | string | null;
  tenant: string;
  project?: string; // NEW: proje ayrımı (APP_ENV vb.)
  module: string;
  eventType: string;

  path?: string;
  method?: string;
  ip?: string;
  country?: string;
  city?: string;

  // accept legacy {lat,lon} on input; stored as GeoJSON Point
  location?:
    | { type: "Point"; coordinates: [number, number] }
    | { lat: number; lon: number };

  userAgent?: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  status?: number;
  message?: string;
  meta?: Record<string, any>;
  uploadedFiles?: string[];

  language: SupportedLocale;
  timestamp?: Date; // default: now (see schema)
}
