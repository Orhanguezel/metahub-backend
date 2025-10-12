import type { Document, Types } from "mongoose";

export type ShippingCalc = "flat" | "table" | "free_over";

export interface IShippingRateRow {
  minWeight?: number;            // grams
  maxWeight?: number;
  minSubtotal_cents?: number;
  maxSubtotal_cents?: number;
  price_cents: number;
}

export interface IShippingMethod extends Document {
  tenant: string;
  code: string;                  // "standard","express"
  name: Map<string, string>;
  active: boolean;
  zones?: Types.ObjectId[];      // ref: geozone
  currency: string;
  calc: ShippingCalc;
  flatPrice_cents?: number;
  freeOver_cents?: number;
  table?: IShippingRateRow[];
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ShipmentStatus =
  | "pending"
  | "packed"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "canceled";

export interface ICarrierDetails {
  company?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  trackingUrl?: string;          // e.g. https://carrier/track/{trackingNumber}
  labelUrl?: string;             // ← eklendi
  customerService?: string;
  supportEmail?: string;
  contactNumber?: string;
}

export interface IShipmentEvent {
  at: Date;
  code: string;                  // "label_printed","picked","handover","in_transit","delivered"...
  desc?: string;
  location?: string;
  raw?: any;                     // webhook snapshot from carrier
}

export interface IShipmentPackageItem {
  orderItemId: Types.ObjectId;
  qty: number;
}

export interface IShipmentPackage {
  packageNo: string;
  items: IShipmentPackageItem[];
  weight_grams?: number;
  dims?: { l: number; w: number; h: number };
}

export interface IShipment extends Document {
  order: Types.ObjectId;
  tenant: string;
  trackingNumber?: string;       // ← opsiyonel
  status: ShipmentStatus;
  estimatedDelivery?: Date;
  carrier?: string;              // "ups","dhl","yurtici"...
  carrierDetails?: ICarrierDetails;
  recipientName: string;
  deliveryType: "standard" | "express" | "same-day";
  packages?: IShipmentPackage[]; // ← eklendi
  events?: IShipmentEvent[];
  createdAt: Date;
  updatedAt: Date;
}
