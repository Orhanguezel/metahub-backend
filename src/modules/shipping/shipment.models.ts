import { Schema, model, models, type Model } from "mongoose";
import type { IShipment, IShipmentEvent, IShipmentPackage } from "./types";

const ShipmentEventSchema = new Schema<IShipmentEvent>(
  {
    at: { type: Date, required: true },
    code: { type: String, required: true, trim: true, lowercase: true },
    desc: String,
    location: String,
    raw: Schema.Types.Mixed,
  },
  { _id: false }
);

const PackageItemSchema = new Schema(
  {
    orderItemId: { type: Schema.Types.ObjectId, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const PackageSchema = new Schema<IShipmentPackage>(
  {
    packageNo: { type: String, required: true, trim: true },
    items: { type: [PackageItemSchema], default: [] },
    weight_grams: Number,
    dims: { l: Number, w: Number, h: Number },
  },
  { _id: false }
);

const ShipmentSchema = new Schema<IShipment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "order", required: true, index: true },
    tenant: { type: String, required: true, index: true },
    trackingNumber: { type: String, trim: true }, // sparse unique ile opsiyonel
    status: {
      type: String,
      enum: ["pending", "packed", "shipped", "in_transit", "out_for_delivery", "delivered", "returned", "canceled"],
      default: "pending",
      index: true,
    },
    estimatedDelivery: Date,
    carrier: String,
    carrierDetails: {
      company: String,
      address: String,
      email: String,
      phone: String,
      website: String,
      trackingUrl: String,
      labelUrl: String, // ← eklendi
      customerService: String,
      supportEmail: String,
      contactNumber: String,
    },
    recipientName: { type: String, required: true, trim: true },
    deliveryType: { type: String, enum: ["standard", "express", "same-day"], default: "standard" },
    packages: { type: [PackageSchema], default: [] }, // ← eklendi
    events: { type: [ShipmentEventSchema], default: [] },
  },
  { timestamps: true }
);

/** Tekillik: trackingNumber varsa tenant içinde unique (sparse) */
ShipmentSchema.index({ tenant: 1, trackingNumber: 1 }, { unique: true, sparse: true });
/** Liste performansı */
ShipmentSchema.index({ tenant: 1, status: 1, createdAt: -1 });

export const Shipment: Model<IShipment> =
  models.shipment || model<IShipment>("shipment", ShipmentSchema);

export default Shipment;
