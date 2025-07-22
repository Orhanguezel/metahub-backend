import mongoose, { Schema, Types,Model } from "mongoose";
import type { Address } from "./types";

const AddressSchema = new Schema<Address>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  tenant: { type: String, required: true },
  street: { type: String, required: true },
  houseNumber: { type: String, required: true },
  city: { type: String, required: true },
  zipCode: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },     // <-- EKLE!
  country: { type: String, required: true },   // <-- required
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Address || mongoose.model<Address>("Address", AddressSchema);


// 📌 Model Guard
const Address: Model<Address> =
  mongoose.models.Address || mongoose.model<Address>("Address", AddressSchema);

export { Address };
