import { Schema, model, Types, Document, Model } from "mongoose";
import { IProduct } from "../product/product.models";

// 🔸 Sepet Ürünü
export interface ICartItem {
  product: Types.ObjectId | IProduct;
  quantity: number;
  priceAtAddition: number;
  totalPriceAtAddition: number;
}

// 🔸 Sepet
export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  totalPrice: number;
  status: "open" | "ordered" | "cancelled";
  isActive: boolean;
  language: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

// 🔸 Alt şema: ürünler
const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    priceAtAddition: {
      type: Number,
      required: true,
    },
    totalPriceAtAddition: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

// 🔸 Ana şema: sepet
const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["open", "ordered", "cancelled"],
      default: "open",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
      required: true,
    },
  },
  { timestamps: true }
);

const Cart: Model<ICart> = model<ICart>("Cart", cartSchema);
export default Cart;
