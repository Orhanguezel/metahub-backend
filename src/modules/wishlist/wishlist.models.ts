import { Schema, model, Types, Document, Model } from "mongoose";

// 📌 Wishlist Item Interface
export interface IWishlist extends Document {
  user: Types.ObjectId;
  products: Types.ObjectId[];
  language?: "tr" | "en" | "de";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 📌 Wishlist Schema
const wishlistSchema = new Schema<IWishlist>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
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

// 📌 Wishlist Model
const Wishlist: Model<IWishlist> = model<IWishlist>("Wishlist", wishlistSchema);

export default Wishlist;
