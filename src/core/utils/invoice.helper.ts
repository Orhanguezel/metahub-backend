import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type { IInvoice, TranslatedLabel } from "@/modules/invoicing/types";
import type { SupportedLocale } from "@/types/common";

/** Basit util: JSON string gelebilecek yerleri parse etme */
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

/** TL (TranslatedLabel) çöz: locale -> en -> ilk dolu değer */
function resolveTL(tl?: TranslatedLabel, locale: SupportedLocale = "en"): string {
  if (!tl || typeof tl !== "object") return "";
  const primary = tl[locale];
  if (primary && primary.trim()) return primary.trim();
  const fallback = tl["en"];
  if (fallback && fallback.trim()) return fallback.trim();
  for (const k of Object.keys(tl)) {
    const v = (tl as any)[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Para formatı */
function fmtMoney(value: number, currency: string, locale: SupportedLocale = "en") {
  const val = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(val);
  } catch {
    // fallback
    return `${currency} ${val.toFixed(2)}`;
  }
}

/** Tarih formatı */
function fmtDate(d?: Date | string, locale: SupportedLocale = "en") {
  if (!d) return "-";
  const dd = (d instanceof Date) ? d : new Date(d);
  try {
    return dd.toLocaleDateString(locale);
  } catch {
    return dd.toISOString().slice(0, 10);
  }
}

/** Satır güvenli hesap (modelde row* yoksa) */
function calcRow(it: any) {
  const qty = Number(it.quantity || 0);
  const up  = Number(it.unitPrice || 0);
  const rate = Number(it.taxRate || 0);
  const gross = Math.max(0, qty * up);
  const rowSubtotal = gross; // satır indirimi yoksa
  const rowTax = Math.max(0, rowSubtotal * (rate / 100));
  const rowTotal = rowSubtotal + rowTax;
  return { rowSubtotal, rowTax, rowTotal };
}

/** PDF çıktısı için opsiyonlar */
export interface GenerateInvoicePdfOptions {
  tenant?: string;             // klasör kökü için
  outDir?: string;             // override
  locale?: SupportedLocale;    // metin/tarih/para formatı
  logoPath?: string;           // üstte logo basmak istersen
  fileName?: string;           // override; default: invoice.code
}

/**
 * v2 Invoice → PDF üret
 * @returns oluşturulan dosyanın tam yolu
 */
export async function generateInvoicePDF(
  invoiceRaw: IInvoice,
  opts: GenerateInvoicePdfOptions = {}
): Promise<string> {
  const invoice = parseIfJson(invoiceRaw) as IInvoice;
  const locale: SupportedLocale = opts.locale || "en";
  const tenant = opts.tenant || invoice.tenant || "default";

  // Çıkış klasörü (tenant-aware)
  const baseDir =
    opts.outDir ||
    process.env.INVOICE_PATH ||
    path.join("uploads", tenant, "invoices");

  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  const fileName = (opts.fileName || invoice.code || `INV-${Date.now()}`) + ".pdf";
  const filePath = path.join(baseDir, fileName);

  // PDF
  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  /* ---- Header ---- */
  if (opts.logoPath && fs.existsSync(opts.logoPath)) {
    try {
      doc.image(opts.logoPath, 40, 30, { width: 120 });
      doc.moveDown();
    } catch { /* logo yüklenmezse sessiz geç */ }
  }

  doc.fontSize(20).text(invoice.type === "creditNote" ? "CREDIT NOTE" : "INVOICE", { align: "right" });
  doc.moveDown(0.5);

  // Sağ üst: kod & tarihler
  doc.fontSize(10);
  doc.text(`Code: ${invoice.code || "-"}`, { align: "right" });
  doc.text(`Issue Date: ${fmtDate(invoice.issueDate, locale)}`, { align: "right" });
  if (invoice.dueDate) doc.text(`Due Date: ${fmtDate(invoice.dueDate, locale)}`, { align: "right" });
  doc.moveDown(1);

  /* ---- Seller / Buyer ---- */
  const seller = invoice.seller || ({} as any);
  const buyer  = invoice.buyer  || ({} as any);
  const startY = doc.y;

  doc.fontSize(12).text("Seller", 40, startY).moveDown(0.2);
  doc.fontSize(10);
  doc.text(seller.name || "-");
  if (seller.addressLine) doc.text(seller.addressLine);
  if (seller.taxId) doc.text(`Tax ID: ${seller.taxId}`);
  if (seller.email) doc.text(`Email: ${seller.email}`);
  if (seller.phone) doc.text(`Phone: ${seller.phone}`);

  const rightX = doc.page.width / 2 + 10;
  doc.fontSize(12).text("Buyer", rightX, startY).moveDown(0.2);
  doc.fontSize(10);
  doc.text(buyer.name || "-", rightX);
  if (buyer.addressLine) doc.text(buyer.addressLine, rightX);
  if (buyer.taxId) doc.text(`Tax ID: ${buyer.taxId}`, rightX);
  if (buyer.email) doc.text(`Email: ${buyer.email}`, rightX);
  if (buyer.phone) doc.text(`Phone: ${buyer.phone}`, rightX);

  doc.moveDown(1);

  /* ---- Items Table ---- */
  const currency = invoice.totals?.currency || "EUR";
  doc.moveDown(0.5);
  doc.fontSize(11).text("Items", { underline: true });
  doc.moveDown(0.5);

  // Table header
  doc.fontSize(10);
  const col = { idx: 40, name: 70, qty: 380, unit: 430, unitPrice: 480, tax: 540, total: 590 };
  doc.text("#", col.idx, doc.y);
  doc.text("Name", col.name, doc.y);
  doc.text("Qty", col.qty, doc.y, { width: 40, align: "right" });
  doc.text("Unit", col.unit, doc.y, { width: 40, align: "right" });
  doc.text("Unit Price", col.unitPrice, doc.y, { width: 50, align: "right" });
  doc.text("Tax %", col.tax, doc.y, { width: 40, align: "right" });
  doc.text("Total", col.total, doc.y, { width: 60, align: "right" });
  doc.moveDown(0.2);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.3);

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  items.forEach((it, i) => {
    const name = resolveTL(it.name, locale) || "-";
    const qty = Number(it.quantity || 0);
    const unit = it.unit || "";
    const unitPrice = Number(it.unitPrice || 0);
    const taxRate = Number(it.taxRate || 0);

    const rowSub  = Number.isFinite(it.rowSubtotal!) ? it.rowSubtotal! : calcRow(it).rowSubtotal;
    const rowTax  = Number.isFinite(it.rowTax!)      ? it.rowTax!      : calcRow(it).rowTax;
    const rowTot  = Number.isFinite(it.rowTotal!)    ? it.rowTotal!    : (rowSub + rowTax);

    // Satır yaz
    doc.text(String(i + 1), col.idx, doc.y);
    doc.text(name, col.name, doc.y, { width: 290 });
    doc.text(qty.toString(), col.qty, doc.y, { width: 40, align: "right" });
    doc.text(unit, col.unit, doc.y, { width: 40, align: "right" });
    doc.text(fmtMoney(unitPrice, currency, locale), col.unitPrice, doc.y, { width: 50, align: "right" });
    doc.text((taxRate || 0).toString(), col.tax, doc.y, { width: 40, align: "right" });
    doc.text(fmtMoney(rowTot, currency, locale), col.total, doc.y, { width: 60, align: "right" });

    // varsa açıklama (small)
    const desc = resolveTL(it.description, locale);
    if (desc) {
      doc.moveDown(0.1);
      doc.fontSize(9).fillColor("#555").text(desc, col.name, doc.y, { width: 470 });
      doc.fillColor("black").fontSize(10);
    }

    doc.moveDown(0.4);
  });

  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.5);

  /* ---- Totals ---- */
  const totals = invoice.totals || ({} as any);
  const rightColX = 360;
  const line = (label: string, value: string) => {
    const y = doc.y;
    doc.text(label, rightColX, y, { width: 160, align: "right" });
    doc.text(value, rightColX + 170, y, { width: 130, align: "right" });
    doc.moveDown(0.2);
  };

  doc.fontSize(10);
  line("Items Subtotal", fmtMoney(totals.itemsSubtotal || 0, currency, locale));
  if (totals.itemsDiscountTotal) line("Items Discount", `- ${fmtMoney(totals.itemsDiscountTotal, currency, locale)}`);
  if (totals.invoiceDiscountTotal) line("Invoice Discount", `- ${fmtMoney(totals.invoiceDiscountTotal, currency, locale)}`);
  line("Tax Total", fmtMoney(totals.taxTotal || 0, currency, locale));
  if (Number(totals.rounding || 0) !== 0) line("Rounding", fmtMoney(totals.rounding, currency, locale));

  doc.moveDown(0.3);
  doc.fontSize(12).text("Grand Total", rightColX, doc.y, { width: 160, align: "right" });
  doc.fontSize(12).text(fmtMoney(totals.grandTotal || 0, currency, locale), rightColX + 170, doc.y, { width: 130, align: "right" });
  doc.moveDown(0.2);
  doc.fontSize(10);
  line("Amount Paid", fmtMoney(totals.amountPaid || 0, currency, locale));
  line("Balance", fmtMoney(totals.balance || 0, currency, locale));

  doc.moveDown(1);

  /* ---- Notes / Terms ---- */
  const notes = resolveTL(invoice.notes, locale);
  const terms = resolveTL(invoice.terms, locale);
  if (notes) {
    doc.fontSize(11).text("Notes", { underline: true });
    doc.fontSize(10).text(notes);
    doc.moveDown(0.6);
  }
  if (terms) {
    doc.fontSize(11).text("Terms", { underline: true });
    doc.fontSize(10).text(terms);
    doc.moveDown(0.6);
  }

  doc.end();

  // stream tamamlanınca yolu döndür
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });

  return filePath;
}
