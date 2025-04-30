import mongoose, {
  Schema,
  model,
  models,
  Types,
  Document,
  Model
} from "mongoose";

// 🔐 Apikey interface
export interface IApikey extends Document {
  name: string;
  key: string;
  status: "active" | "revoked";
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 🔐 Apikey schema
const apikeySchema = new Schema<IApikey>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

// 🔐 Apikey model
export const Apikey: Model<IApikey> =
  models.Apikey || model<IApikey>("Apikey", apikeySchema);

// 📊 ApiKeyLog interface
export interface IApiKeyLog extends Document {
  apiKey: Types.ObjectId;
  route: string;
  method: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  createdAt: Date;
}

// 📊 ApiKeyLog schema
const apiKeyLogSchema = new Schema<IApiKeyLog>(
  {
    apiKey: { type: Schema.Types.ObjectId, ref: "Apikey", required: true },
    route: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// 📊 ApiKeyLog model
export const ApiKeyLog: Model<IApiKeyLog> =
  models.ApiKeyLog || model<IApiKeyLog>("ApiKeyLog", apiKeyLogSchema);
