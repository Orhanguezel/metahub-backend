// models/address.model.ts
import { Schema, Model, models, model } from "mongoose";
import type { Address } from "@/modules/address/types";
import { ADDRESS_TYPE_OPTIONS } from "@/modules/address/types";

// --- Mongoose Schema ---
const AddressSchema = new Schema<Address>(
  {
    addressType: {
      type: String,
      enum: ADDRESS_TYPE_OPTIONS,
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "user" },
    companyId: { type: Schema.Types.ObjectId, ref: "company" },
    customerId: { type: Schema.Types.ObjectId, ref: "customer" },
    sellerId: { type: Schema.Types.ObjectId, ref: "seller" },
    tenant: { type: String, required: true },

    addressLine: { type: String, required: true },  // her ülke için zorunlu

    // Ülkeye özgü/opsiyonel alanlar:
    street: { type: String },        // DE, FR, ES, PL
    houseNumber: { type: String },   // DE, FR, ES, PL
    city: { type: String },          // hepsinde (opsiyonel)
    district: { type: String },      // TR, opsiyonel
    province: { type: String },      // TR, DE, EN, FR, ES, PL
    postalCode: { type: String },    // hepsinde (opsiyonel)
    country: { type: String },       // kod veya isim

    phone: { type: String },
    email: { type: String },

    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// --- Model guard ---
const Address: Model<Address> = models.address || model<Address>("address", AddressSchema);

export { Address, AddressSchema };
