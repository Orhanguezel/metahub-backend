import { Schema, model, Types, Model, models } from "mongoose";
import { ICart, ICartItem } from "@/modules/cart/types";

// 🛒 Sepet Ürün Alt Şeması
const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Types.ObjectId, ref: "RadonarProd", required: true },
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
    items: { type: [cartItemSchema], default: [] },
    totalPrice: { type: Number, required: true, default: 0 },
    couponCode: { type: String, default: null },
    status: { type: String, enum: ["open", "ordered", "cancelled"], default: "open" },
    isActive: { type: Boolean, default: true },
    discount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 🛒 Model Guard (Tekrarlı create engellenir)
const Cart: Model<ICart> = models.Cart || model<ICart>("Cart", cartSchema);

export { Cart };
