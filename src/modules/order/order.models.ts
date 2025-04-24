import { Schema, model, Document, Types, Model } from "mongoose";

// 🔹 Sipariş Ürün Tipi
export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number; // ✅ EKLENDİ
}

// 🔹 Adres Tipi
export interface IShippingAddress {
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

// 🔹 Enumlar
export type PaymentMethod = "cash_on_delivery";
export type OrderStatus = "pending" | "preparing" | "shipped" | "completed" | "cancelled";

// 🔹 Sipariş Ana Arayüzü
export interface IOrder extends Document {
  user?: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  isDelivered: boolean;
  isPaid: boolean;
  language?: string;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 🔸 Alt Şema – Sipariş Ürünleri
const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // ✅ EKLENDİ
  },
  { _id: false }
);

// 🔸 Alt Şema – Teslimat Adresi
const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

// 🔸 Ana Sipariş Şeması
const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    totalPrice: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery"],
      default: "cash_on_delivery",
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "shipped", "completed", "cancelled"],
      default: "pending",
    },
    language: { type: String, enum: ["tr", "en", "de"], default: "en" },
    isDelivered: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

// 🔸 Model Export
const Order: Model<IOrder> = model<IOrder>("Order", orderSchema);
export default Order;
