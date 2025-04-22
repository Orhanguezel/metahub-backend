// src/models/AnalyticsEvent.ts
import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  path: String,
  method: String,
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  query: Object,
  body: Object,
  module: String,        // 👈 e.g. "products", "orders", "cart"
  eventType: String,     // 👈 e.g. "view", "create", "update"
});

export default mongoose.model("AnalyticsEvent", analyticsEventSchema);
