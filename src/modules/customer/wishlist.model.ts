import { Schema, model, models, type Model, Types } from "mongoose";

export interface IWishlistItem {
  product: Types.ObjectId;
  addedAt?: Date;
}

export interface IWishlist {
  tenant: string;
  user: Types.ObjectId;                 // auth user
  items: IWishlistItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const WishlistItemSchema = new Schema<IWishlistItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "product", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WishlistSchema = new Schema<IWishlist>(
  {
    tenant: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
    items: { type: [WishlistItemSchema], default: [] },
  },
  { timestamps: true }
);

WishlistSchema.index({ tenant: 1, user: 1 }, { unique: true });

export const Wishlist: Model<IWishlist> =
  models.wishlist || model<IWishlist>("wishlist", WishlistSchema);
export default Wishlist;
