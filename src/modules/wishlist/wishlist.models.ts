// src/modules/wishlist/wishlist.models.ts
import { Schema, model, Types, Model, models } from "mongoose";

// ✅ Interface
export interface IWishlist {
  user: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  products: Types.ObjectId[];
  language?: "tr" | "en" | "de";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Schema
const wishlistSchema = new Schema<IWishlist>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    tenant: {
      type: String,
      required: true,
      index: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "product",
        required: true,
      },
    ],
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ✅ Guard + Model Tipi
const Wishlist: Model<IWishlist> =
  models.wishlist || model<IWishlist>("wishlist", wishlistSchema);

export { Wishlist };
