import type { ObjectId } from "mongoose";
import type { TranslatedLabel } from "@/types/common";
import { Types } from "mongoose";

export interface IOfferItem {
  product?: Types.ObjectId;          // ref: "product"
  ensotekprod?: Types.ObjectId;      // ref: "ensotekprod"
  productName: TranslatedLabel;
  quantity: number;
  unitPrice: number;
  customPrice?: number;
  vat: number;
  total: number;
}

export interface IOfferRevision {
  pdfUrl: string;
  updatedAt: Date;
  by: Types.ObjectId;     // ref: "user"
  note?: string;
}

export interface IOffer {
  _id?: ObjectId;
  tenant: string;
  offerNumber: string;
  user?: ObjectId | null;           // ref: "user" | null
  company?: ObjectId | null;        // ref: "company" | null
  customer?: ObjectId | null;      // ref: "customer" | null
  contactPerson?: string;
  items: IOfferItem[];
  shippingCost?: number;
  additionalFees?: number;
  discount?: number;
  currency: string;
  paymentTerms: TranslatedLabel;
  notes?: TranslatedLabel;
  validUntil: Date;
  status: "draft" | "preparing" | "sent" | "pending" | "approved" | "rejected";
  totalNet: number;
  totalVat: number;
  totalGross: number;
  pdfUrl?: string;
  sentByEmail?: boolean;
  sentAt?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  revisionHistory?: IOfferRevision[];
  createdBy?: ObjectId | null;      // ref: "user" | null
  createdAt: Date;
  updatedAt: Date;
}
