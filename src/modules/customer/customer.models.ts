import { Schema, model, Model, models } from "mongoose";

// ✅ Customer Interface
export interface ICustomer  {
  companyName: string;
  contactName: string;
  email: string;
  tenant: string; // Optional tenant field for multi-tenancy
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Customer Schema
const customerSchema = new Schema<ICustomer>(
  {
    companyName: { type: String, required: true, unique: true },
    tenant: { type: String, required: true, index: true },
    contactName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const Customer: Model<ICustomer> =
  models.Customer || model<ICustomer>("Customer", customerSchema);

export { Customer };
