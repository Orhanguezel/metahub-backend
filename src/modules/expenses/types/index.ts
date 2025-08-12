import type { Types } from "mongoose";

export type Money = number; // 2 ondalık; model içinde yuvarlanır

export interface IFileAsset {
  url: string;
  name?: string;
  mime?: string;
  size?: number;      // bytes
  publicId?: string;  // CDN/Cloud id
}

export interface IApproval {
  status: "pending" | "approved" | "rejected";
  approverRef?: Types.ObjectId;   // ref: user/employee
  note?: string;
  at?: Date;
  stage?: "supervisor" | "finance" | "custom";
}

export interface ITaxBreakdown {
  rate: number;       // % (örn 18)
  base: Money;        // vergi matrahı
  tax: Money;         // vergi tutarı
  total: Money;       // base + tax
}

export interface IExpenseLine {
  // Sınıflandırma
  categoryRef?: Types.ObjectId;       // ref: expensecategory (ileride)
  categoryName?: string;              // snapshot
  description?: string;

  // Miktar/fiyat
  qty?: number;                        // varsayılan 1
  unitPrice?: Money;                   // satır birim fiyat
  discount?: Money;                    // satır indirimi (tutar)
  taxRate?: number;                    // % (örn 18)

  // Otomatik hesaplananlar
  netAmount?: Money;                   // (qty*unitPrice - discount)
  taxAmount?: Money;                   // net * taxRate/100
  totalAmount?: Money;                 // net + tax

  // Dağıtım / izleme
  apartmentRef?: Types.ObjectId;       // ref: apartment
  jobRef?: Types.ObjectId;             // ref: operationsjob
  serviceRef?: Types.ObjectId;         // ref: service
  contractRef?: Types.ObjectId;        // ref: contract
  tags?: string[];
}

export interface IExpense {
  _id?: Types.ObjectId;

  tenant: string;                      // Multi-tenant
  code?: string;                       // EX-YYYY-xxxxxx (otomatik)
  type: "vendor_bill" | "purchase" | "reimbursement" | "subscription" | "utility" | "other";

  // İlişkiler
  vendorRef?: Types.ObjectId;          // ref: contact (tipi: vendor)
  employeeRef?: Types.ObjectId;        // ref: employee (reimbursement için)
  apartmentRef?: Types.ObjectId;       // hızlı rapor
  jobRef?: Types.ObjectId;             // hızlı rapor

  // Tarihler
  expenseDate: Date;                   // belge/fiş tarihi
  dueDate?: Date;                      // ödeme vadesi
  postedAt?: Date;                     // deftere işlenme

  // Para birimi / FX
  currency: string;                    // "EUR","TRY",...
  baseCurrency?: string;               // tenant bazlı rapor para birimi
  fxRate?: number;                     // 1 currency = fxRate * baseCurrency
  // Toplamlar (belge para birimi)
  subTotal?: Money;                    // satır net toplamı
  discountTotal?: Money;               // satır indirim toplamı
  taxTotal?: Money;                    // vergi toplamı
  grandTotal?: Money;                  // genel toplam
  taxBreakdown?: ITaxBreakdown[];      // oran bazında döküm

  // Ödemeler
  paymentRefs?: Types.ObjectId[];      // ref: payment
  paidAmount?: Money;                  // ödenen
  balance?: Money;                     // kalan (grandTotal - paidAmount)

  // Reimbursement
  reimbursable?: boolean;              // çalışana ait geri-ödenecek mi?
  reimbursementStatus?: "not_required" | "pending" | "submitted" | "approved" | "paid";

  // Durum
  status: "draft" | "submitted" | "approved" | "scheduled" | "partially_paid" | "paid" | "rejected" | "void";

  // İçerik
  vendorBillNo?: string;               // tedarikçi fatura/fiş no
  lines: IExpenseLine[];
  notes?: string;
  internalNote?: string;
  attachments?: IFileAsset[];
  approvals?: IApproval[];
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}
