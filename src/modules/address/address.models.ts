import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { onlyLetters as names } from "../../core/utils/regex";

// 📌 TypeScript Interface
export interface IAddress extends Document {
  userId: Types.ObjectId;
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  country?: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Address: Model<IAddress> = mongoose.model<IAddress>("Address", addressSchema);
export default Address;
