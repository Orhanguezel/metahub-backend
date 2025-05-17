import { Schema, model, models, Types, Model } from "mongoose";

export interface ICarrierDetails {
  company?: string;
  contactNumber?: string;
}

export interface IShipment  {
  order: Types.ObjectId;
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

export default Shipment;
export { Shipment };
