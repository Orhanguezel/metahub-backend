import mongoose, { Schema, model, models, Types, Model } from "mongoose";

export interface IApikey {
  name: string;
  key: string;
  status: "active" | "revoked";
  lastUsedAt?: Date;
  tenant: string; // Optional tenant field for multi-tenancy
  createdAt: Date;
  updatedAt: Date;
}

const ApikeySchema = new Schema<IApikey>(
  {
    name: { type: String, required: true },
    tenant: { type: String, required: true, index: true },
    key: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

const Apikey: Model<IApikey> =
  models.apikey || model<IApikey>("apikey", ApikeySchema);

// 📊 ApiKeyLog
export interface IApikeylog {
  apiKey: Types.ObjectId;
  route: string;
  tenant: string; // Optional tenant field for multi-tenancy
  method: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  createdAt: Date;
}

const ApikeylogSchema = new Schema<IApikeylog>(
  {
    apiKey: { type: Schema.Types.ObjectId, ref: "apikey", required: true },
    tenant: { type: String, required: true, index: true },
    route: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Apikeylog: Model<IApikeylog> =
  models.apikeylog || model<IApikeylog>("apikeylog", ApikeylogSchema);

export { Apikey, Apikeylog };
