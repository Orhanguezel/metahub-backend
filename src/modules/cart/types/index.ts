import { Types } from "mongoose";
import { IBike } from "@/modules/bikes/types";

export interface ICartItem {
  product: Types.ObjectId | IBike;
  quantity: number;
  priceAtAddition: number;
  totalPriceAtAddition: number;
}

export interface ICart {
  user: Types.ObjectId;
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
