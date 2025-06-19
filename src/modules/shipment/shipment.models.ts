import { Schema, model, models, Types, Model } from "mongoose";

export interface ICarrierDetails {
  company?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  trackingUrl?: string;
  customerService?: string;
  supportEmail?: string;
  contactNumber?: string;
  tenant?: string; // Optional tenant field for multi-tenancy
}

export interface IShipment  {
  order: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  trackingNumber: string;
  status: "pending" | "shipped" | "delivered" | "returned";
  estimatedDelivery?: Date;
  carrier?: string;
  carrierDetails?: ICarrierDetails;
  recipientName: string;
  deliveryType: "standard" | "express" | "same-day";
  createdAt: Date;
  updatedAt: Date;
}

const shipmentSchema = new Schema<IShipment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    tenant: { type: String, required: true, index: true },
    trackingNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "returned"],
      default: "pending",
    },
    estimatedDelivery: { type: Date },
    carrier: { type: String },
    carrierDetails: {
      company: { type: String },
      contactNumber: { type: String },
    },
    recipientName: { type: String, required: true },
    deliveryType: {
      type: String,
      enum: ["standard", "express", "same-day"],
      default: "standard",
    },
  },
  { timestamps: true }
);

// ✅ Guard + Model Tipi (standart yapı)
const Shipment: Model<IShipment> =
  models.Shipment || model<IShipment>("Shipment", shipmentSchema);

export { Shipment };
