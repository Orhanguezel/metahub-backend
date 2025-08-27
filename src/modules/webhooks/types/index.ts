import type { Document, Types } from "mongoose";

export type WebhookEvent =
  | "order.created"
  | "order.status.changed"
  | "payment.created"
  | "payment.refunded"
  | "promotion.redeemed"
  | "coupon.created"
  | "coupon.updated"
  | "menuitem.updated"
  | "system.ping" // test endpointleri için
  | "*" // wildcard: tüm eventler
  ;

export type RetryStrategy = "fixed" | "exponential";

export interface IWebhookHeaderKV {
  key: string;
  value: string;
}

export interface IWebhookSigning {
  algorithm: "HMAC-SHA256";
  headerName: string;          // örn: "x-mh-signature"
  timestampHeaderName: string; // örn: "x-mh-timestamp"
  version?: "v1";
  timestampSkewSec?: number;   // replay koruması için (default: 300s)
}

export interface IWebhookRetryPolicy {
  maxAttempts: number;       // 1..10
  strategy: RetryStrategy;   // fixed | exponential
  baseBackoffSec: number;    // fixed: hep bu; exponential: 2^n * base
  timeoutMs?: number;        // HTTP timeout
}

export interface IWebhookEndpoint extends Document {
  tenant: string;
  name: string;
  description?: string;
  targetUrl: string;           // https://...
  httpMethod: "POST" | "PUT";
  isActive: boolean;
  events: WebhookEvent[];      // dinlediği eventler ( "*" destekler )
  secret: string;              // HMAC shared secret
  headers?: IWebhookHeaderKV[];
  verifySSL?: boolean;         // default: true
  signing: IWebhookSigning;
  retry: IWebhookRetryPolicy;

  lastDeliveredAt?: Date;
  lastStatus?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWebhookDelivery extends Document {
  tenant: string;
  endpointRef: Types.ObjectId;
  eventType: string;
  payload: any;
  attempt: number;
  success: boolean;

  requestHeaders: Record<string, string>;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  durationMs?: number;

  createdAt?: Date;
  updatedAt?: Date;
}
