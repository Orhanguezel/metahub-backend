// src/modules/analytics/model.ts
import mongoose, { Schema, model } from "mongoose";
import type { IAnalyticsLog } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

const analyticsSchema = new Schema<IAnalyticsLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user" },
    tenant: { type: String, required: true, index: true },
    project: { type: String, index: true }, // NEW
    module: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },

    path: String,
    method: String,
    ip: String,
    country: String,
    city: String,

    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] }, // [lon, lat]
    },

    userAgent: String,
    query: Object,
    body: Object,
    status: Number,
    message: String,
    meta: Object,
    uploadedFiles: [{ type: String }],

    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
      default: "en",
      index: true,
    },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// index’ler
analyticsSchema.index({ location: "2dsphere" });
analyticsSchema.index({ tenant: 1, timestamp: -1 });
analyticsSchema.index({ tenant: 1, module: 1, eventType: 1, timestamp: -1 });
analyticsSchema.index({ tenant: 1, project: 1, timestamp: -1 });
analyticsSchema.index({ tenant: 1, country: 1, city: 1, timestamp: -1 });

const Analytics =
  (mongoose.models.analytics as mongoose.Model<IAnalyticsLog>) ||
  model<IAnalyticsLog>("analytics", analyticsSchema);

export { Analytics };
