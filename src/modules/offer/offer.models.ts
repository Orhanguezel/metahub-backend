import { Schema, model, Types, Model, models } from "mongoose";

// ✅ Alt Tip: Teklif Ürünleri
interface IOfferItem {
  product: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  quantity: number;
  unitPrice: number;
  customPrice: number;
}

// ✅ Ana Interface
export interface IOffer {
  offerNumber: string;
  user: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  company: Types.ObjectId;
  customer: Types.ObjectId;
  items: IOfferItem[];
  totalAmount: number;
  taxAmount: number;
  taxRate: 7 | 19;
  shippingCost: number;
  paymentTerms: string;
  status: "draft" | "preparing" | "sent" | "pending" | "approved" | "rejected";
  validUntil: Date;
  notes: string;
  sentByEmail: boolean;
  pdfLink: string;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Alt Şema
const offerItemSchema = new Schema<IOfferItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "product", required: true },
    quantity: { type: Number, required: true },
    tenant: { type: String, required: true, index: true },
    unitPrice: { type: Number, required: true },
    customPrice: { type: Number, required: true },
  },
  { _id: false }
);

// ✅ Ana Şema
const offerSchema = new Schema<IOffer>(
  {
    offerNumber: { type: String, required: true, unique: true },
    tenant: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },
    company: { type: Schema.Types.ObjectId, ref: "company", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "customer", required: true },
    items: {
      type: [offerItemSchema],
      validate: (items: IOfferItem[]) => items.length > 0,
    },
    totalAmount: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    taxRate: { type: Number, enum: [7, 19], default: 19 },
    shippingCost: { type: Number, default: 0 },
    paymentTerms: { type: String, default: "30 gün içinde ödeme" },
    status: {
      type: String,
      enum: ["draft", "preparing", "sent", "pending", "approved", "rejected"],
      default: "draft",
    },
    validUntil: { type: Date, required: true },
    notes: { type: String, default: "" },
    sentByEmail: { type: Boolean, default: false },
    pdfLink: { type: String, default: "" },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (standart)
const Offer: Model<IOffer> =
  models.offer || model<IOffer>("offer", offerSchema);

// ✅ Export
export { Offer };
