import { Schema, Model, Types, models, model } from "mongoose";
import type { Address } from "./types";

// --- AddressSchema (hem userId hem companyId opsiyonel) ---
const AddressSchema = new Schema<Address>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: false }, // Opsiyonel
    companyId: { type: Schema.Types.ObjectId, ref: "company", required: false }, // Opsiyonel
    tenant: { type: String, required: true },
    street: { type: String, required: true },
    houseNumber: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// --- Model Guard (Tek Noktadan Export) ---
const Address: Model<Address> =
  models.address || model<Address>("address", AddressSchema);

export { Address, AddressSchema };
