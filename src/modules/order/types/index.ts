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
  quantity: number;
  tenant: string; // Optional tenant field for multi-tenancy
  unitPrice: number;
}

export interface IShippingAddress {
  name: string;
  phone: string;
  tenant: string; // Optional tenant field for multi-tenancy
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface IOrder {
  user: Types.ObjectId;
  addressId?: Types.ObjectId;
  items: IOrderItem[];
  tenant: string; // Optional tenant field for multi-tenancy
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
