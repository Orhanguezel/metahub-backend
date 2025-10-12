import { Schema, model, models, type Model } from "mongoose";
import type { IWebhookEndpoint, IWebhookDelivery } from "../types/webhooks.types";

const HeaderKVSchema = new Schema(
  { key: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false }
);

const SigningSchema = new Schema(
  {
    algorithm: { type: String, enum: ["HMAC-SHA256"], default: "HMAC-SHA256" },
    headerName: { type: String, default: "x-mh-signature" },
    timestampHeaderName: { type: String, default: "x-mh-timestamp" },
    version: { type: String, default: "v1" },
    timestampSkewSec: { type: Number, default: 300 },
  },
  { _id: false }
);

const RetrySchema = new Schema(
  {
    maxAttempts: { type: Number, min: 1, max: 10, default: 3 },
    strategy: { type: String, enum: ["fixed", "exponential"], default: "exponential" },
    baseBackoffSec: { type: Number, min: 1, max: 3600, default: 30 },
    timeoutMs: { type: Number, min: 1000, max: 120000, default: 15000 },
  },
  { _id: false }
);

const WebhookEndpointSchema = new Schema<IWebhookEndpoint>(
  {
    tenant: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    targetUrl: { type: String, required: true, trim: true },
    httpMethod: { type: String, enum: ["POST", "PUT"], default: "POST" },
    isActive: { type: Boolean, default: true, index: true },
    events: { type: [String], default: ["*"], index: true },
    secret: { type: String, required: true, select: false },
    headers: { type: [HeaderKVSchema], default: [] },
    verifySSL: { type: Boolean, default: true },
    signing: { type: SigningSchema, default: {} },
    retry: { type: RetrySchema, default: {} },
    lastDeliveredAt: Date,
    lastStatus: Number,
  },
  { timestamps: true }
);

WebhookEndpointSchema.set("toJSON", {
  transform: (_doc, ret) => { delete (ret as any).secret; return ret; }
});

WebhookEndpointSchema.index({ tenant: 1, targetUrl: 1 });

export const WebhookEndpoint: Model<IWebhookEndpoint> =
  models.webhookendpoint || model<IWebhookEndpoint>("webhookendpoint", WebhookEndpointSchema);

const WebhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    tenant: { type: String, required: true, index: true },
    endpointRef: { type: Schema.Types.ObjectId, ref: "webhookendpoint", required: true, index: true },
    eventType: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed },
    attempt: { type: Number, default: 0 },
    success: { type: Boolean, default: false },
    requestHeaders: { type: Schema.Types.Mixed, default: {} },
    responseStatus: Number,
    responseBody: { type: String, maxlength: 20000 },
    error: String,
    durationMs: Number,
  },
  { timestamps: true }
);

WebhookDeliverySchema.index({ tenant: 1, endpointRef: 1, createdAt: -1 });

export const WebhookDelivery: Model<IWebhookDelivery> =
  models.webhookdelivery || model<IWebhookDelivery>("webhookdelivery", WebhookDeliverySchema);

export default { WebhookEndpoint, WebhookDelivery };
