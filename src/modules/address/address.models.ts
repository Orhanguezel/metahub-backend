import mongoose, { Schema, Model, Types } from "mongoose";
import { onlyLetters as names } from "@/core/utils/regex";

export interface IAddress {
  userId: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  country?: string;
  phone: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenant: {
      type: String,
      required: true,
      index: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 50,
      validate: {
        validator: function (val: string) {
          return names.test(val);
        },
        message: "Street must contain only letters",
      },
    },
    houseNumber: {
      type: String,
      required: true,
      trim: true,
      minLength: 1,
      maxLength: 10,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50,
      validate: {
        validator: function (val: string) {
          return names.test(val);
        },
        message: "City must contain only letters",
      },
    },
    zipCode: {
      type: String,
      required: true,
      trim: true,
      minLength: 4,
      maxLength: 10,
    },
    country: {
      type: String,
      trim: true,
      default: "Germany",
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxLength: 20,
      validate: {
        validator: function (val: string) {
          return /^[0-9+\s()-]+$/.test(val);
        },
        message: "Phone must be a valid phone number",
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 📌 Model Guard
const Address: Model<IAddress> =
  mongoose.models.Address || mongoose.model<IAddress>("Address", addressSchema);

export { Address };
