import { Schema, Model, models, model } from "mongoose";
import type { Address, AddressType } from "@/modules/address/types";
import { ADDRESS_TYPE_OPTIONS } from "@/modules/address/types";

// ✅ Mongoose Schema
const AddressSchema = new Schema<Address>(
  {
    addressType: {
      type: String,
      enum: ADDRESS_TYPE_OPTIONS,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: false,
    },
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

// ✅ Model guard
const Address: Model<Address> = models.address || model<Address>("address", AddressSchema);

export { Address, AddressSchema };
