import { Types } from "mongoose";
import { IBike } from "@/modules/bikes/types";

export interface ICartItem {
  product: Types.ObjectId | IBike;
  tenant: string; // Optional tenant field for multi-tenancy
  quantity: number;
  priceAtAddition: number;
  totalPriceAtAddition: number;
}

export interface ICart {
  user: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  items: ICartItem[];
  totalPrice: number;
  couponCode?: string;
  status: "open" | "ordered" | "cancelled";
  isActive: boolean;
  discount?: number;
  createdAt: Date;
  updatedAt: Date;
  language: string;
}
