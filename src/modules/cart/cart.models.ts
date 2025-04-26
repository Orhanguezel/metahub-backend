import { Schema, model, Types, Document, Model } from "mongoose";
import { IProduct } from "../product";

export interface ICartItem {
  product: Types.ObjectId | IProduct;
  quantity: number;
  priceAtAddition: number;
  totalPriceAtAddition: number;
}

export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  totalPrice: number;
  couponCode?: string;
  status: "open" | "ordered" | "cancelled";
  isActive: boolean;
  discount?: number;
  label: {
    tr: string;
    en: string;
    de: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    priceAtAddition: { type: Number, required: true },
    totalPriceAtAddition: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [cartItemSchema], default: [] },
    totalPrice: { type: Number, required: true, default: 0 },
    couponCode: { type: String, default: null },
    status: { type: String, enum: ["open", "ordered", "cancelled"], default: "open" },
    isActive: { type: Boolean, default: true },
    discount: { type: Number, default: 0 },
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
  },
  { timestamps: true }
);

const Cart: Model<ICart> = model<ICart>("Cart", cartSchema);
export default Cart;
