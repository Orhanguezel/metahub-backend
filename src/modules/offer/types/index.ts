// modules/offers/types.ts
import type { ObjectId } from "mongoose";
import type { TranslatedLabel } from "@/types/common";

export type OfferStatus = "draft" | "preparing" | "sent" | "pending" | "approved" | "rejected";

export type OfferItemType = "ensotekprod" | "sparepart";

export interface IOfferItem {
  // Discriminant + ilgili ref
  productType: OfferItemType;
  ensotekprod?: ObjectId;      // productType === "ensotekprod" ise zorunlu
  sparepart?: ObjectId;        // productType === "sparepart"  ise zorunlu

  productName: TranslatedLabel;
  quantity: number;
  unitPrice: number;
  customPrice?: number;
  vat: number;                 // %
  total: number;               // line gross (calc)
}

export interface IOfferRevision {
  pdfUrl: string;
  updatedAt: Date;
  by: ObjectId;                // ref: "user"
  note?: string;
}

export interface IStatusHistory {
  status: OfferStatus;
  at: Date;
  by?: ObjectId | null;
  note?: string;
}

export interface IOfferEmailMeta {
  to?: string;
  cc?: string[];
  bcc?: string[];
  subject?: TranslatedLabel;
  body?: TranslatedLabel;
  lastEmailError?: string | null;
}

export interface IOffer {
  _id?: ObjectId;
  tenant: string;
  offerNumber: string;

  source?: "internal" | "publicForm" | "import";
  rfqId?: ObjectId | null;

  user?: ObjectId | null;      // ref: "user"
  company?: ObjectId | null;   // ref: "company"
  customer?: ObjectId | null;  // ref: "customer"
  contactPerson?: string;

  items: IOfferItem[];
  shippingCost?: number;
  additionalFees?: number;
  discount?: number;

  currency: string;
  paymentTerms: TranslatedLabel;
  notes?: TranslatedLabel;

  validUntil: Date;

  status: OfferStatus;
  statusHistory?: IStatusHistory[];

  totalNet: number;
  totalVat: number;
  totalGross: number;

  pdfUrl?: string;
  revisionHistory?: IOfferRevision[];

  email?: IOfferEmailMeta;
  sentByEmail?: boolean;
  sentAt?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;

  acceptTokenHash?: string | null;

  attachments?: Array<{ url: string; name?: string; mime?: string; size?: number }>;

  createdBy?: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
