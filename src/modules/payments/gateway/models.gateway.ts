import { Schema, model, models, type Model } from "mongoose";
import type { PaymentProvider } from "../types/gateway.types";

export interface IPaymentGateway {
  tenant: string;
  provider: PaymentProvider;
  isActive: boolean;
  mode: "test" | "live";
  credentials: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const GatewaySchema = new Schema<IPaymentGateway>(
  {
    tenant: { type: String, index: true, required: true, trim: true },
    provider: {
      type: String,
      required: true,
      enum: ["stripe", "paypal", "iyzico", "paytr", "craftgate", "papara", "paycell", "manual"],
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    mode: { type: String, enum: ["test", "live"], default: "test" },
    credentials: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

GatewaySchema.index({ tenant: 1, provider: 1 }, { unique: true });

export const PaymentGateway: Model<IPaymentGateway> =
  (models.paymentgateway as Model<IPaymentGateway>) ||
  model<IPaymentGateway>("paymentgateway", GatewaySchema);

export default PaymentGateway;
