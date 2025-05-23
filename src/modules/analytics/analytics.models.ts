import mongoose, { Schema, Model, Types } from "mongoose";

export interface IAnalytics  {
  userId?: Types.ObjectId | null;
  path: string;
  method: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  query?: Record<string, any>;
  body?: Record<string, any>;
  module: string;
  eventType: string;
}

const analyticsSchema = new Schema<IAnalytics>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    path: { type: String, required: true },
    method: { type: String, required: true },
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now },
    query: { type: Object },
    body: { type: Object },
    module: { type: String, required: true },      // 👈 örn: "products"
    eventType: { type: String, required: true },   // 👈 örn: "view"
  },
  { timestamps: false }
);

const Analytics: Model<IAnalytics> =
  mongoose.models.Analytics ||
  mongoose.model<IAnalytics>("Analytics", analyticsSchema);

export { Analytics };
