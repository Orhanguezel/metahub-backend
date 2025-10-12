// src/modules/tax/models.geozone.ts

import { Schema, model, models, type Model } from "mongoose";
import type { IGeoZone } from "./types";

const GeoZoneSchema = new Schema<IGeoZone>(
  {
    tenant: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    countries: { type: [String], default: [] },
    states: { type: [String], default: [] },
    postalCodes: { type: [String], default: [] },
  },
  { timestamps: true }
);

GeoZoneSchema.index({ tenant: 1, name: 1 }, { unique: true });

export const GeoZone: Model<IGeoZone> =
  models.geozone || model<IGeoZone>("geozone", GeoZoneSchema);

export default GeoZone;
