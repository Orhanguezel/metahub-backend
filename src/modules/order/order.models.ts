import { Schema, model, models, Types, Model } from "mongoose";
import type { IOrder, IOrderItem, IShippingAddress } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// --- ORDER ITEM: Dinamik refPath ile! ---
const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "items.productType", // <<<--- DİNAMİK REFERANS!
    },
    productType: {
      type: String,
      required: true,
      enum: ["bike", "ensotekprod", "sparepart"], // İstediğin kadar model ekle
    },
    tenant: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// --- SHIPPING ADDRESS ---
const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    name: { type: String, required: true, trim: true },
    tenant: { type: String, required: true, index: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// --- ORDER SCHEMA ---
const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },
    tenant: { type: String, required: true, index: true },
    addressId: { type: Schema.Types.ObjectId, ref: "address" },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [
        (v: any[]) => v.length > 0,
        "Order must have at least one item.",
      ],
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    totalPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    coupon: { type: Schema.Types.ObjectId, ref: "coupon" },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "credit_card", "paypal"],
      default: "cash_on_delivery",
      required: true,
    },
    payments: [{ type: Schema.Types.ObjectId, ref: "payment" }],
    status: {
      type: String,
      enum: ["pending", "preparing", "shipped", "completed", "cancelled"],
      default: "pending",
      required: true,
    },
    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
      default: "en",
    },
    isDelivered: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

export const Order: Model<IOrder> =
  models.order || model<IOrder>("order", orderSchema);
