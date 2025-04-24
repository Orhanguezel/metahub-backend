import { Schema, model, Types, Document, Model } from "mongoose";

// 🔸 Alt Tip: Teklif Ürünleri
export interface IOfferItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  customPrice: number;
}

// 🔸 Ana Arayüz
export interface IOffer extends Document {
  offerNumber: string;
  user: Types.ObjectId;
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

// 🔸 Alt Şema: Ürünler
const offerItemSchema = new Schema<IOfferItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    customPrice: { type: Number, required: true },
  },
  { _id: false }
);

// 🔸 Ana Şema: Teklif
const offerSchema = new Schema<IOffer>(
  {
    offerNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: {
      type: [offerItemSchema],
      validate: (items: IOfferItem[]) => items.length > 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      enum: [7, 19],
      default: 19,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    paymentTerms: {
      type: String,
      default: "30 gün içinde ödeme",
    },
    status: {
      type: String,
      enum: ["draft", "preparing", "sent", "pending", "approved", "rejected"],
      default: "draft",
    },
    validUntil: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    sentByEmail: {
      type: Boolean,
      default: false,
    },
    pdfLink: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Offer: Model<IOffer> = model<IOffer>("Offer", offerSchema);
export default Offer;
