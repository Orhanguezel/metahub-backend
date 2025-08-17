// src/core/pdf/generateInvoicePDF.ts
import fs from "fs";
import path from "path";
import PDFDocument, { PDFKit } from "pdfkit";
import type { IInvoice, TranslatedLabel } from "@/modules/invoicing/types";
import type { SupportedLocale } from "@/types/common";

// i18n
import invoiceI18n from "@/modules/invoicing/i18n";
import { t as translate } from "@/core/utils/i18n/translate";

/** JSON string gelebilecek yerleri parse etme (sessiz düşer) */
const parseIfJson = (v: any) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
};

/** i18n helper (fallback'lı) */
function L(
  key: string,
  locale: SupportedLocale,
  params?: Record<string, any>,
  fallback?: string
) {
  const s = translate(`pdf.invoice.${key}`, locale, invoiceI18n as any, params);
  return typeof s === "string" && s.trim() ? s : fallback ?? key;
}

/** TranslatedLabel çöz: locale -> en -> ilk dolu */
function resolveTL(tl?: TranslatedLabel, locale: SupportedLocale = "en"): string {
  if (!tl || typeof tl !== "object") return "";
  const primary = (tl as any)[locale];
  if (primary && typeof primary === "string" && primary.trim()) return primary.trim();
  const fallback = (tl as any)["en"];
  if (fallback && typeof fallback === "string" && fallback.trim()) return fallback.trim();
  for (const k of Object.keys(tl)) {
    const v = (tl as any)[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Para formatı */
function fmtMoney(value: any, currency: string, locale: SupportedLocale = "en") {
  const val = Number(value);
  const n = Number.isFinite(val) ? val : 0;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

/** Tarih formatı */
function fmtDate(d?: Date | string, locale: SupportedLocale = "en") {
  if (!d) return "-";
  const dd = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dd.getTime())) return "-";
  try {
    return dd.toLocaleDateString(locale);
  } catch {
    return dd.toISOString().slice(0, 10);
  }
}

/** Satır hesap (modelde hazır değer yoksa) */
function calcRow(it: any) {
  const qty = Number(it?.quantity ?? 0);
  const up = Number(it?.unitPrice ?? 0);
  const rate = Number(it?.taxRate ?? 0);
  const rowSubtotal = Math.max(0, qty * up);
  const rowTax = Math.max(0, rowSubtotal * (rate / 100));
  const rowTotal = rowSubtotal + rowTax;
  return { rowSubtotal, rowTax, rowTotal };
}

/* ================= helpers (TS-friendly) ================= */

/** y getter (type-safe olmayan alanları güvenli kullan) */
const getY = (doc: PDFDocument) => (doc as any).y as number;

/** moveDown yoksa metinle boş satır it */
function moveDown(doc: PDFDocument, lines = 0.5) {
  const fn = (doc as any).moveDown;
  if (typeof fn === "function") {
    fn.call(doc, lines);
    return;
  }
  const count = Math.max(1, Math.round(lines)); // yaklaşık
  for (let i = 0; i < count; i++) doc.text("\n");
}

/** sayfanın altına yaklaşıldıysa yeni sayfa */
function ensureSpace(doc: PDFDocument, minSpace = 80) {
  const bottomMargin = doc.page?.margins?.bottom ?? 40;
  const pageHeight = doc.page?.height ?? 842; // A4 varsayılan
  if (getY(doc) > pageHeight - bottomMargin - minSpace) {
    doc.addPage();
    return true;
  }
  return false;
}

/** Sağ hizalı metin (x,y,options imzasıyla) */
function textRight(doc: PDFDocument, text: string, margin: number, contentWidth: number) {
  doc.text(text, margin, getY(doc), { width: contentWidth, align: "right" });
}

/** Bölüm başlığı: kalın yaz + alt çizgi */
function sectionTitle(doc: PDFDocument, title: string, margin: number, contentWidth: number) {
  doc.fontSize(11).text(title, margin, getY(doc));
  moveDown(doc, 0.2);
  const y = getY(doc);
  doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
  moveDown(doc, 0.3);
}

export interface GenerateInvoicePdfOptions {
  tenant?: string; // klasör kökü
  outDir?: string; // override
  locale?: SupportedLocale; // metin/tarih/para formatı
  logoPath?: string; // başlık logosu
  fileName?: string; // override (default: invoice.code)
}

/**
 * v2 Invoice → PDF üret
 * Dönen değer: oluşturulan PDF dosyasının tam yolu
 */
export async function generateInvoicePDF(
  invoiceRaw: IInvoice,
  opts: GenerateInvoicePdfOptions = {}
): Promise<string> {
  const invoice = parseIfJson(invoiceRaw) as IInvoice;
  const locale: SupportedLocale = (opts.locale || "en") as SupportedLocale;
  const tenant = (opts.tenant || (invoice as any)?.tenant || "default") as string;

  // Çıkış klasörü (tenant-aware)
  const baseDir = opts.outDir || process.env.INVOICE_PATH || path.join("uploads", tenant, "invoices");
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  const code = (invoice as any)?.code || `INV-${Date.now()}`;
  const fileName = (opts.fileName || code) + ".pdf";
  const filePath = path.join(baseDir, fileName);

  // PDF init (types: PDFDocumentOptions -> autoFirstPage yok)
  const margin = 40;
  const doc = new PDFDocument({ margin });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  /* ===== Header ===== */
  if (opts.logoPath && fs.existsSync(opts.logoPath)) {
    try {
      doc.image(opts.logoPath, margin, margin - 5, { width: 120 });
    } catch {
      /* logo okunamazsa sessiz geç */
    }
  }

  const contentWidth = (doc.page?.width ?? 595) - margin * 2;
  const isCredit = (invoice as any)?.type === "creditNote";

  doc.fontSize(20);
  textRight(
    doc,
    isCredit ? L("creditNote", locale, {}, "CREDIT NOTE") : L("invoice", locale, {}, "INVOICE"),
    margin,
    contentWidth
  );
  moveDown(doc, 0.5);

  // Sağ üst: kod & tarihler
  doc.fontSize(10);
  textRight(doc, `${L("code", locale, {}, "Code")}: ${code || "-"}`, margin, contentWidth);
  textRight(doc, `${L("issueDate", locale, {}, "Issue Date")}: ${fmtDate((invoice as any)?.issueDate, locale)}`, margin, contentWidth);
  if ((invoice as any)?.dueDate) {
    textRight(doc, `${L("dueDate", locale, {}, "Due Date")}: ${fmtDate((invoice as any)?.dueDate, locale)}`, margin, contentWidth);
  }
  moveDown(doc, 1);

  /* ===== Seller / Buyer ===== */
  const seller = (invoice as any)?.seller || {};
  const buyer = (invoice as any)?.buyer || {};
  const startY = getY(doc);

  doc.fontSize(12).text(L("seller", locale, {}, "Seller"), margin, startY);
  moveDown(doc, 0.2);
  doc.fontSize(10);
  doc.text(String(seller?.name || "-"), margin, getY(doc));
  if (seller?.addressLine) doc.text(String(seller.addressLine), margin, getY(doc));
  if (seller?.taxId) doc.text(`${L("taxId", locale, {}, "Tax ID")}: ${seller.taxId}`, margin, getY(doc));
  if (seller?.email) doc.text(`${L("email", locale, {}, "Email")}: ${seller.email}`, margin, getY(doc));
  if (seller?.phone) doc.text(`${L("phone", locale, {}, "Phone")}: ${seller.phone}`, margin, getY(doc));

  const rightX = (doc.page.width / 2) + 10;
  doc.fontSize(12).text(L("buyer", locale, {}, "Buyer"), rightX, startY);
  moveDown(doc, 0.2);
  doc.fontSize(10);
  doc.text(String(buyer?.name || "-"), rightX, getY(doc));
  if (buyer?.addressLine) doc.text(String(buyer.addressLine), rightX, getY(doc));
  if (buyer?.taxId) doc.text(`${L("taxId", locale, {}, "Tax ID")}: ${buyer.taxId}`, rightX, getY(doc));
  if (buyer?.email) doc.text(`${L("email", locale, {}, "Email")}: ${buyer.email}`, rightX, getY(doc));
  if (buyer?.phone) doc.text(`${L("phone", locale, {}, "Phone")}: ${buyer.phone}`, rightX, getY(doc));

  moveDown(doc, 1);

  /* ===== Items Table ===== */
  const currency = (invoice as any)?.totals?.currency || "EUR";
  moveDown(doc, 0.5);
  sectionTitle(doc, L("items", locale, {}, "Items"), margin, contentWidth);

  // Kolon yerleşimi (sayfa genişliğine göre güvenli)
  const widths = {
    idx: 22,
    name: Math.max(200, contentWidth - (22 + 54 + 54 + 90 + 54 + 90)), // esnek isim kolon
    qty: 54,
    unit: 54,
    unitPrice: 90,
    tax: 54,
    total: 90
  };
  const x = {
    idx: margin,
    name: margin + widths.idx,
    qty: margin + widths.idx + widths.name,
    unit: margin + widths.idx + widths.name + widths.qty,
    unitPrice: margin + widths.idx + widths.name + widths.qty + widths.unit,
    tax: margin + widths.idx + widths.name + widths.qty + widths.unit + widths.unitPrice,
    total: margin + widths.idx + widths.name + widths.qty + widths.unit + widths.unitPrice + widths.tax
  };

  function drawHeader() {
    doc.fontSize(10);
    doc.text("#", x.idx, getY(doc), { width: widths.idx, align: "left" });
    doc.text(L("name", locale, {}, "Name"), x.name, getY(doc), { width: widths.name, align: "left" });
    doc.text(L("qty", locale, {}, "Qty"), x.qty, getY(doc), { width: widths.qty, align: "right" });
    doc.text(L("unit", locale, {}, "Unit"), x.unit, getY(doc), { width: widths.unit, align: "right" });
    doc.text(L("unitPrice", locale, {}, "Unit Price"), x.unitPrice, getY(doc), {
      width: widths.unitPrice,
      align: "right"
    });
    doc.text(L("taxPct", locale, {}, "Tax %"), x.tax, getY(doc), { width: widths.tax, align: "right" });
    doc.text(L("total", locale, {}, "Total"), x.total, getY(doc), { width: widths.total, align: "right" });
    moveDown(doc, 0.3);
    const y = getY(doc);
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
    moveDown(doc, 0.3);
  }

  drawHeader();

  const items = Array.isArray((invoice as any)?.items) ? (invoice as any).items : [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    if (ensureSpace(doc, 60)) drawHeader();

    const name = resolveTL(it?.name, locale) || "-";
    const qty = Number(it?.quantity ?? 0);
    const unit = String(it?.unit ?? "");
    const unitPriceNum = Number(it?.unitPrice ?? 0);
    const taxRate = Number(it?.taxRate ?? 0);

    const pre = calcRow(it);
    const rowSub = Number.isFinite(Number(it?.rowSubtotal)) ? Number(it.rowSubtotal) : pre.rowSubtotal;
    const rowTax = Number.isFinite(Number(it?.rowTax)) ? Number(it.rowTax) : pre.rowTax;
    const rowTot = Number.isFinite(Number(it?.rowTotal)) ? Number(it.rowTotal) : rowSub + rowTax;

    doc.fontSize(10);
    doc.text(String(i + 1), x.idx, getY(doc), { width: widths.idx, align: "left" });
    doc.text(name, x.name, getY(doc), { width: widths.name, align: "left" });
    doc.text(qty.toString(), x.qty, getY(doc), { width: widths.qty, align: "right" });
    doc.text(unit, x.unit, getY(doc), { width: widths.unit, align: "right" });
    doc.text(fmtMoney(unitPriceNum, currency, locale), x.unitPrice, getY(doc), {
      width: widths.unitPrice,
      align: "right"
    });
    doc.text((taxRate || 0).toString(), x.tax, getY(doc), { width: widths.tax, align: "right" });
    doc.text(fmtMoney(rowTot, currency, locale), x.total, getY(doc), { width: widths.total, align: "right" });

    // opsiyonel açıklama satırı
    const desc = resolveTL(it?.description, locale);
    if (desc) {
      if (ensureSpace(doc, 40)) drawHeader();
      moveDown(doc, 0.1);
      doc.fontSize(9).text(
        desc,
        x.name,
        getY(doc),
        { width: widths.name + widths.qty + widths.unit + widths.unitPrice + widths.tax + widths.total, align: "left" }
      );
      doc.fontSize(10);
    }

    moveDown(doc, 0.4);
  }

  moveDown(doc, 0.5);
  {
    const y = getY(doc);
    doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
  }
  moveDown(doc, 0.5);

  /* ===== Totals ===== */
  const totals = (invoice as any)?.totals || {};
  const rightColX = margin + contentWidth - 300; // toplam bloğu genişliği ~300px
  const labelW = 160;
  const valueW = 130;

  const line = (label: string, value: string) => {
    const y = getY(doc);
    doc.text(label, rightColX, y, { width: labelW, align: "right" });
    doc.text(value, rightColX + labelW + 10, y, { width: valueW, align: "right" });
    moveDown(doc, 0.2);
  };

  doc.fontSize(10);
  line(L("itemsSubtotal", locale, {}, "Items Subtotal"), fmtMoney(totals.itemsSubtotal || 0, currency, locale));
  if (Number(totals.itemsDiscountTotal)) {
    line(
      L("itemsDiscount", locale, {}, "Items Discount"),
      `- ${fmtMoney(totals.itemsDiscountTotal, currency, locale)}`
    );
  }
  if (Number(totals.invoiceDiscountTotal)) {
    line(
      L("invoiceDiscount", locale, {}, "Invoice Discount"),
      `- ${fmtMoney(totals.invoiceDiscountTotal, currency, locale)}`
    );
  }
  line(L("taxTotal", locale, {}, "Tax Total"), fmtMoney(totals.taxTotal || 0, currency, locale));
  if (Number(totals.rounding || 0) !== 0) {
    line(L("rounding", locale, {}, "Rounding"), fmtMoney(totals.rounding, currency, locale));
  }

  moveDown(doc, 0.3);
  doc.fontSize(12);
  line(L("grandTotal", locale, {}, "Grand Total"), fmtMoney(totals.grandTotal || 0, currency, locale));
  doc.fontSize(10);
  line(L("amountPaid", locale, {}, "Amount Paid"), fmtMoney(totals.amountPaid || 0, currency, locale));
  line(L("balance", locale, {}, "Balance"), fmtMoney(totals.balance || 0, currency, locale));

  moveDown(doc, 1);

  /* ===== Notes / Terms ===== */
  const notes = resolveTL((invoice as any)?.notes, locale);
  const terms = resolveTL((invoice as any)?.terms, locale);

  if (notes) {
    ensureSpace(doc, 80);
    sectionTitle(doc, L("notes", locale, {}, "Notes"), margin, contentWidth);
    doc.fontSize(10).text(notes, margin, getY(doc), { width: contentWidth, align: "left" });
    moveDown(doc, 0.6);
  }

  if (terms) {
    ensureSpace(doc, 80);
    sectionTitle(doc, L("terms", locale, {}, "Terms"), margin, contentWidth);
    doc.fontSize(10).text(terms, margin, getY(doc), { width: contentWidth, align: "left" });
    moveDown(doc, 0.6);
  }

  // finalize
  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });

  return filePath;
}
