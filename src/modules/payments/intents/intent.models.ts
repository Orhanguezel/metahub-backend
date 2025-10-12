import { Schema, model, models, type Model } from "mongoose";
import type { IntentStatus, PaymentProvider } from "../types/gateway.types";

export interface IPaymentIntent {
  tenant: string;
  order?: any;
  provider: PaymentProvider;
  providerRef?: string;
  method?: string;
  amount: number;          // minor units
  currency: string;
  status: IntentStatus;
  clientSecret?: string;
  hostedUrl?: string;
  latestError?: string;
  metadata?: Record<string, any>;
  createdBy?: any;
  expiresAt?: Date;

  /** NEW: debug/analitik için */
  uiMode?: "embedded" | "hosted" | "elements";

  createdAt?: Date;
  updatedAt?: Date;
}

const IntentSchema = new Schema<IPaymentIntent>(
  {
    tenant: { type: String, index: true, required: true },
    order: { type: Schema.Types.ObjectId, ref: "order" },

    provider: {
      type: String,
      enum: ["stripe", "paypal", "iyzico", "paytr", "craftgate", "papara", "paycell", "manual"],
      required: true
    },

    providerRef: { type: String, index: true },
    method: { type: String },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },

    status: {
      type: String,
      enum: ["requires_payment_method", "requires_action", "processing", "succeeded", "canceled", "failed"],
      default: "requires_payment_method",
      index: true,
    },

    clientSecret: String,
    hostedUrl: String,
    latestError: String,
    metadata: { type: Schema.Types.Mixed },

    createdBy: { type: Schema.Types.ObjectId, ref: "user" },
    expiresAt: { type: Date },

    /** NEW: uiMode alanı (opsiyonel) */
    uiMode: { type: String, enum: ["embedded", "hosted", "elements"], required: false },
  },
  { timestamps: true }
);

/* Indexler */
IntentSchema.index({ tenant: 1, provider: 1, providerRef: 1 }, { unique: true, sparse: true });
IntentSchema.index({ tenant: 1, order: 1, createdAt: -1 });
IntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

IntentSchema.set("toJSON", { versionKey: false });
IntentSchema.set("toObject", { versionKey: false });

export const PaymentIntent: Model<IPaymentIntent> =
  (models.paymentintent as Model<IPaymentIntent>) ||
  model<IPaymentIntent>("paymentintent", IntentSchema);
