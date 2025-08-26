import type { SupportedLocale } from "@/types/common";
import type { Types } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]?: string };

export type InvoiceType =
  | "invoice"
  | "creditNote";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "sent"
  | "partially_paid"
  | "paid"
  | "canceled";

export type ItemKind = "service" | "fee" | "product" | "custom";

export type Discount =
  | { type: "rate"; value: number }
  | { type: "amount"; value: number };

export interface IInvoicePartySnapshot {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  contactName?: string;
}

export interface IInvoiceLinks {
  // Apartment ekosistemi
  customer?: Types.ObjectId;
  apartment?: Types.ObjectId;
  contract?: Types.ObjectId;
  billingPlan?: Types.ObjectId;
  billingOccurrences?: Types.ObjectId[];

  // Legacy/ek: eski modülden gelenler
  order?: Types.ObjectId;
  user?: Types.ObjectId;
  company?: Types.ObjectId;
}

export interface IInvoiceItem {
  kind: ItemKind;
  ref?: Types.ObjectId;
  name: TranslatedLabel;
  description?: TranslatedLabel;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: Discount;
  taxRate?: number;
  rowSubtotal?: number;
  rowTax?: number;
  rowTotal?: number;

  // NEW (optional): menuitem gibi satırlara ekstra bilgi taşıyabilmek için
  meta?: any; // { menu?: { variantCode, modifiers, snapshot... }, priceComponents?: {...} } vb.
}

export interface IInvoiceTotals {
  currency: string;
  fxRate?: number;
  // NEW (optional): brüt toplam (satır indirimleri öncesi)
  itemsGrossTotal?: number;

  // FIX: bu alan “satır indirimi sonrası ara toplam”ı temsil etmeli
  itemsSubtotal: number;

  itemsDiscountTotal: number;
  invoiceDiscountTotal: number;
  taxTotal: number;
  rounding?: number;
  grandTotal: number;
  amountPaid: number;
  balance: number;
}

export interface IInvoice {
  _id?: Types.ObjectId;

  tenant: string;
  code: string;
  type: InvoiceType;
  status: InvoiceStatus;

  issueDate: Date;
  dueDate?: Date;
  periodStart?: Date;
  periodEnd?: Date;

  seller: IInvoicePartySnapshot;
  buyer: IInvoicePartySnapshot;

  links?: IInvoiceLinks;

  items: IInvoiceItem[];
  invoiceDiscount?: Discount;
  totals: IInvoiceTotals;

  notes?: TranslatedLabel;
  terms?: TranslatedLabel;
  attachments?: Array<{ url: string; name?: string }>;

  sentAt?: Date;
  paidAt?: Date;

  reverses?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}
