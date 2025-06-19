import mongoose, { Schema, model } from "mongoose";
import type { IAnalyticsLog } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// --- ŞEMA ---
const analyticsSchema = new Schema<IAnalyticsLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    tenant: { type: String, required: true, index: true },
    module: { type: String, required: true },
    eventType: { type: String, required: true },
    path: { type: String },
    method: { type: String },
    ip: { type: String },
    country: { type: String },
    city: { type: String },
   location: {
  type: {
    type: String,
    enum: ["Point"],
  },
  coordinates: {
    type: [Number],
  },
},



    userAgent: { type: String },
    query: { type: Object },
    body: { type: Object },
    status: { type: Number },
    message: { type: String },
    meta: { type: Object },
    uploadedFiles: [{ type: String }],
    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
      default: "en",
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// **2️⃣ Otomatik 2dsphere index**
analyticsSchema.index({ location: "2dsphere" }); // Bunu ekle!

const Analytics =
  (mongoose.models.Analytics as mongoose.Model<IAnalyticsLog>) ||
  model<IAnalyticsLog>("Analytics", analyticsSchema);

export { Analytics };
