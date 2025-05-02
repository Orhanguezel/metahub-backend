import { Schema, model, models, Document, Types, Model } from "mongoose";

interface InvoiceItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface IInvoice extends Document {
  order: Types.ObjectId;
  user: Types.ObjectId;
  company: Types.ObjectId;
  items: InvoiceItem[];
  totalAmount: number;
  taxRate: number;
  taxAmount: number;
  issuedAt: Date;
  status: "pending" | "paid" | "overdue";
  invoiceNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<InvoiceItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
});

const invoiceSchema = new Schema<IInvoice>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    items: [invoiceItemSchema],
    totalAmount: { type: Number, required: true },
    taxRate: { type: Number, default: 19 },
    taxAmount: { type: Number, default: 0 },
    issuedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },
    invoiceNumber: { type: String, unique: true },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type
const Invoice: Model<IInvoice> =
  models.Invoice || model<IInvoice>("Invoice", invoiceSchema);

export default Invoice;
export { IInvoice };
