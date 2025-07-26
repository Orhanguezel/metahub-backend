import { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

export type PaymentMethod = "cash_on_delivery" | "credit_card" | "paypal";
export type OrderStatus =
  | "pending"
  | "preparing"
  | "shipped"
  | "completed"
  | "cancelled";

export interface IOrderItem {
  product: Types.ObjectId;
  productType: "bike" | "ensotekprod" | "sparepart"; // burada hangi koleksiyon olduğunu belirtiyoruz
  quantity: number;
  tenant: string;
  unitPrice: number;
}

export interface IShippingAddress {
  name: string;
  phone: string;
  tenant: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface IOrder {
  user: Types.ObjectId;
  addressId?: Types.ObjectId;
  items: IOrderItem[];
  tenant: string;
  shippingAddress: IShippingAddress;
  totalPrice: number;
  discount?: number;
  coupon?: Types.ObjectId;
  paymentMethod: PaymentMethod;
  payments?: Types.ObjectId[];
  status: OrderStatus;
  isDelivered: boolean;
  isPaid: boolean;
  deliveredAt?: Date;
  language?: SupportedLocale;
  createdAt?: Date;
  updatedAt?: Date;
}
