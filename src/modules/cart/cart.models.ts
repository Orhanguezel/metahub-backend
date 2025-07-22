import { Schema, model, Types, Model, models } from "mongoose";
import { ICart, ICartItem } from "@/modules/cart/types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🛒 Sepet Ürün Alt Şeması
const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      refPath: "items.productType",
      required: true,
    },
    productType: {
      type: String,
      enum: ["Bike", "Ensotekprod", "Sparepart"],
      required: true,
    },
    tenant: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    priceAtAddition: { type: Number, required: true },
    totalPriceAtAddition: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

// 🛒 Ana Sepet Şeması
const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenant: { type: String, required: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    totalPrice: { type: Number, required: true, default: 0 },
    couponCode: { type: String, default: null },
    status: {
      type: String,
      enum: ["open", "ordered", "cancelled"],
      default: "open",
    },
    isActive: { type: Boolean, default: true },
    discount: { type: Number, default: 0 },
    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
      default: "en",
    },
  },
  { timestamps: true }
);

// 🛒 Model Guard (Tekrarlı create engellenir)
const Cart: Model<ICart> = models.Cart || model<ICart>("Cart", cartSchema);

export { Cart };
