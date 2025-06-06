import { Schema, model, models, Types, Model } from "mongoose";
import type { IOrder, IOrderItem, IShippingAddress } from "./types";

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: "RadonarProd", required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const shippingAddressSchema = new Schema<IShippingAddress>({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  addressId: { type: Schema.Types.ObjectId, ref: "Address" },
  items: { type: [orderItemSchema], required: true, validate: [(v: any[]) => v.length > 0, "Order must have at least one item."] },
  shippingAddress: { type: shippingAddressSchema, required: true },
  totalPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0 },
  coupon: { type: Schema.Types.ObjectId, ref: "Coupon" },
  paymentMethod: {
    type: String,
    enum: ["cash_on_delivery", "credit_card", "paypal"],
    default: "cash_on_delivery",
    required: true,
  },
  payments: [{ type: Schema.Types.ObjectId, ref: "Payment" }],
  status: {
    type: String,
    enum: ["pending", "preparing", "shipped", "completed", "cancelled"],
    default: "pending",
    required: true,
  },
  language: { type: String, enum: ["tr", "en", "de"], default: "en" },
  isDelivered: { type: Boolean, default: false },
  isPaid: { type: Boolean, default: false },
  deliveredAt: { type: Date },
}, { timestamps: true });

export const Order: Model<IOrder> =
  models.Order || model<IOrder>("Order", orderSchema);
