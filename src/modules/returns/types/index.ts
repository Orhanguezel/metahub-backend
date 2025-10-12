import type { Document, Types } from "mongoose";

export type RMAStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "received"
  | "refunded"
  | "closed";

export interface IRMALine {
  itemIndex: number;   // order.items içindeki index
  qty: number;         // iade adedi
  reason?: string;
}

export interface IRMATimelineItem {
  at: Date;
  status: RMAStatus;
  note?: string;
}

export interface IReturnRMA extends Document {
  tenant: string;
  order: Types.ObjectId;
  user?: Types.ObjectId;
  code: string;                      // RMA-YYYY-XXXXXX
  lines: IRMALine[];
  status: RMAStatus;
  timeline: IRMATimelineItem[];

  createdAt?: Date;
  updatedAt?: Date;
}
