import { Types } from "mongoose";
import { IRadonarProd } from "@/modules/radonarprod/types"; 

export interface ICartItem {
  product: Types.ObjectId | IRadonarProd;
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
