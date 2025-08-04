import { Schema, model, models, Model, Types } from "mongoose";
import type { ICustomer } from "./types";

const customerSchema = new Schema<ICustomer>(
  {
    tenant: { type: String, required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    addresses: [{ type: Schema.Types.ObjectId, ref: "address" }],
    isActive: { type: Boolean, required: true, default: true },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

// Tenant+Email unique index
customerSchema.index({ tenant: 1, email: 1 }, { unique: true });

const Customer: Model<ICustomer> =
  models.customer || model<ICustomer>("customer", customerSchema);

export { Customer };
