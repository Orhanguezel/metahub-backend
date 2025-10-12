import type { Types } from "mongoose";

export interface ICompareItem {
  product: Types.ObjectId;         // ref: product
  variant?: Types.ObjectId | null; // ref: productvariant
  addedAt: Date;
  note?: string;
}

export interface ICompare {
  tenant: string;
  user?: Types.ObjectId | null;    // ref: user (auth’lu)
  session?: string | null;         // guest anahtarı (x-session-id)
  isPublic?: boolean;
  items: ICompareItem[];
  createdAt?: Date;
  updatedAt?: Date;
}
