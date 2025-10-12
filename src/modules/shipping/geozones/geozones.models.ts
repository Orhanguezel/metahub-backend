// src/modules/shipping/geozones.models.ts
import { Schema, model, models, type Model } from "mongoose";

export interface IShippingGeoZone {
  tenant: string;
  code: string;
  name: Record<string,string>;
  isActive: boolean;
  countries: string[];
  states?: string[];
  citiesInc?: string[];
  citiesExc?: string[];
  postalInc?: string[];
  postalExc?: string[];
  priority: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ShippingGeoZoneSchema = new Schema<IShippingGeoZone>({
  tenant:   { type: String, required: true, index: true },
  code:     { type: String, required: true, trim: true, lowercase: true },
  name:     { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true, index: true },
  countries:{ type: [String], default: [] },
  states:   { type: [String], default: [] },
  citiesInc:{ type: [String], default: [] },
  citiesExc:{ type: [String], default: [] },
  postalInc:{ type: [String], default: [] },
  postalExc:{ type: [String], default: [] },
  priority: { type: Number, default: 0 },
}, { timestamps: true });

ShippingGeoZoneSchema.index({ tenant: 1, code: 1 }, { unique: true });
ShippingGeoZoneSchema.index({ tenant: 1, isActive: 1, priority: -1 });

// Default (global) bağlantı için model – isim çakışmasın diye "shipgeozone" kullanalım
export const ShippingGeoZone: Model<IShippingGeoZone> =
  models.shipgeozone || model<IShippingGeoZone>("shipgeozone", ShippingGeoZoneSchema, "ship_geozones");

export default ShippingGeoZone;
