// src/core/pdf/generateOfferPdf.ts
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";
import { getDateLocale, SUPPORTED_LOCALES } from "@/types/common";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogoBuffer } from "./getLogoBuffer";
import { addLogoToPdf } from "./addLogoToPdf";
import { uploadBufferToCloudinary } from "./uploadBufferToCloudinary";

/** ENV’ler */
const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER || "cloudinary").toLowerCase();
const BASE_UPLOAD_DIR = process.env.UPLOAD_ROOT || "uploads";
const BASE_URL = (process.env.BASE_URL || "http://localhost:5019").replace(/\/$/, "");
const DEFAULT_FONT_PATH =
  process.env.PDF_FONT_PATH || path.join(process.cwd(), "src/core/pdf/fonts/DejaVuSans.ttf");
const CLOUD_ROOT = (process.env.CLOUDINARY_FOLDER || "uploads").replace(/\/+$/, "");

/** Helpers */
function emptyTL() { const o: Record<string, string> = {}; for (const l of SUPPORTED_LOCALES) o[l] = ""; return o; }
function safeTL(tl?: TranslatedLabel, locale?: SupportedLocale) {
  if (!tl) return ""; if (locale && tl[locale]) return tl[locale]; if (tl.en) return tl.en;
  return (Object.values(tl).find(Boolean) as string) || "";
}
function money(n:number, locale:SupportedLocale, currency:string) {
  const loc = getDateLocale(locale);
  try { return new Intl.NumberFormat(loc,{style:"currency",currency}).format(Number(n)||0); }
  catch { return `${Number(n||0).toLocaleString(loc,{minimumFractionDigits:2})} ${currency}`; }
}
const s = (v:any)=> (v==null ? "-" : String(v));
const slugify = (v:any)=> String(v ?? "").trim().replace(/\s+/g,"_").replace(/[^\w.-]/g,"_");
const sanitizeTenant = (v:any)=> String(v ?? "default").toLowerCase().replace(/[^a-z0-9_-]/gi,"_");
const logoPng = (img:any)=> {
  const src = img?.webp || img?.url || img?.thumbnail;
  return src?.endsWith(".webp") ? src.replace(/\.webp$/i, ".png") : src;
};
const moveDown = (doc:PDFDocument, n=1)=> (typeof (doc as any).moveDown==="function" ? (doc as any).moveDown(n) : (doc as any).y=((doc as any).y||0)+12*n);
const fillCol = (doc:PDFDocument, c?:string)=> (typeof (doc as any).fillColor==="function" && (doc as any).fillColor(c));
function header(doc:PDFDocument, t:(k:string,p?:any)=>string, top:number){
  doc.fontSize(10);
  doc.text(t("table.pos"), 40, top);
  doc.text(t("table.product"), 70, top);
  doc.text(t("table.qty"), 300, top, { width: 50 });
  doc.text(t("table.unitPrice"), 370, top, { width: 60, align: "right" });
  doc.text(t("table.total"), 440, top, { width: 70, align: "right" });
  doc.moveTo(40, top + 15).lineTo(540, top + 15).stroke();
}
const cloudOk = ()=> Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
function isValidPdf(buf: Buffer) {
  // Başta %PDF-
  if (buf.slice(0, 5).toString("ascii") !== "%PDF-") return false;
  // Sonda %%EOF (son 2KB içinde arama)
  const tail = buf.slice(-2048).toString("ascii");
  return /%%EOF\s*$/.test(tail);
}

/** Üret + Yükle + URL döndür */
export async function generateOfferPdf(
  offerObj: any,
  company: any,
  customer: any,
  locale: SupportedLocale
): Promise<string> {
  // 1) Logo
  const logoUrl = Array.isArray(company?.images) && company.images.length > 0 ? logoPng(company.images[0]) : undefined;
  const logoBuffer = await getLogoBuffer(logoUrl);

  // 2) PDF
  const doc: PDFDocument = new PDFDocument({ size: "A4", margin: 40 });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk) => buffers.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });

  // 3) Font (opsiyonel)
  try {
    if (fs.existsSync(DEFAULT_FONT_PATH)) {
      doc.registerFont("dejavu", DEFAULT_FONT_PATH);
      doc.font("dejavu");
    }
  } catch {}

  const t = (key: string, params?: any) => s(translate(key, locale, translations, params));
  const loc = getDateLocale(locale);
  const currency = offerObj.currency || "EUR";
  const now = new Date();

  // 4) Logo
  if (logoBuffer) addLogoToPdf(doc, logoBuffer, 430, 35, 95);

  // 5) Şirket bilgileri
  const companyName = typeof company?.companyName === "object" ? safeTL(company.companyName, locale) : (company?.companyName || "—");
  doc.fontSize(17).text(companyName, 40, 40);
  doc.fontSize(12);
  if (company?.email) doc.text(s(company.email), 40);
  if (company?.phone) doc.text(s(company.phone), 40);
  doc.fontSize(9);
  if (company?.website) doc.text(s(company.website), 40);
  if (company?.address && typeof company.address === "object") {
    const a = company.address;
    const line = [a.street, `${a.postalCode??""} ${a.city??""}`.trim(), a.country].filter(Boolean).join(", ");
    if (line) doc.text(s(line), 40);
  }
  if (company?.bankDetails) {
    if (company.bankDetails.bankName) doc.text(`Bank: ${s(company.bankDetails.bankName)}`, 40);
    if (company.bankDetails.iban) doc.text(`IBAN: ${s(company.bankDetails.iban)}`, 40);
    if (company.bankDetails.swiftCode) doc.text(`SWIFT/BIC: ${s(company.bankDetails.swiftCode)}`, 40);
  }
  if (company?.taxNumber) doc.text(`${t("taxNumber")}: ${s(company.taxNumber)}`, 40);
  if (company?.handelsregisterNumber) doc.text(`${t("registerNumber")}: ${s(company.handelsregisterNumber)}`, 40);
  if (company?.registerCourt) doc.text(`${t("registerCourt")}: ${s(company.registerCourt)}`, 40);

  // Sağ üst: tarih + teklif no
  doc.fontSize(10)
    .text(`${t("date")}: ${now.toLocaleDateString(loc)}`, 420, 140, { align: "right" })
    .text(`${t("offerNumber")}: ${s(offerObj.offerNumber)}`, 420, 155, { align: "right" });

  // 6) Müşteri
  moveDown(doc, 0.7);
  doc.fontSize(12).text(`${t("customer")}:`, 40);
  doc.fontSize(10);
  const customerCompany = typeof customer?.companyName === "object" ? safeTL(customer.companyName, locale) : (customer?.companyName || "");
  if (customerCompany) doc.text(s(customerCompany), 40);
  if (customer?.contactName) doc.text(s(customer.contactName), 40);
  if (customer?.address) {
    const a = customer.address;
    const line = [a.street, `${a.postalCode??""} ${a.city??""}`.trim(), a.country].filter(Boolean).join(", ");
    if (line) doc.text(s(line), 40);
  }
  if (customer?.email) doc.text(s(customer.email), 40);
  if (customer?.phone) doc.text(s(customer.phone), 40);

  // 7) Başlık + intro
  moveDown(doc);
  doc.fontSize(16).text(t("offerTitle"), 40);
  moveDown(doc, 0.5);
  doc.fontSize(10).text(t("introParagraph"), 40);
  moveDown(doc);

  // 8) Tablo
  let y = (doc as any).y as number;
  header(doc, t, y); y += 20;
  const bottomLimit = (doc as any).page.height - (doc as any).page.margins.bottom - 120;
  const items = Array.isArray(offerObj.items) ? offerObj.items : [];

  items.forEach((it:any, idx:number) => {
    if (y > bottomLimit) { doc.addPage(); y = (doc as any).y as number; header(doc, t, y); y += 20; }
    const pname = typeof it.productName === "object" ? safeTL(it.productName, locale) : s(it.productName);
    doc.fontSize(10);
    doc.text(String(idx + 1), 40, y);
    doc.text(pname, 70, y, { width: 220 });
    doc.text(`${it.quantity}`, 300, y, { width: 50 });
    doc.text(money(Number(it.unitPrice), locale, currency), 370, y, { width: 60, align: "right" });
    doc.text(money(Number(it.total), locale, currency), 440, y, { width: 70, align: "right" });
    y += 20;
  });
  doc.moveTo(40, y).lineTo(540, y).stroke();

  // 9) Toplamlar
  y += 5;
  doc.fontSize(11);
  doc.text(t("table.subtotal"), 370, y, { width: 100, align: "right" });
  doc.text(money(Number(offerObj.totalNet), locale, currency), 470, y, { width: 70, align: "right" });
  y += 18;

  const vatPct = Number(items[0]?.vat ?? 19);
  doc.fontSize(10);
  doc.text(`${t("table.vat")} ${vatPct}%`, 370, y, { width: 100, align: "right" });
  doc.text(money(Number(offerObj.totalVat), locale, currency), 470, y, { width: 70, align: "right" });
  y += 15;

  if (offerObj.shippingCost) {
    doc.text(t("table.shipping"), 370, y, { width: 100, align: "right" });
    doc.text(money(Number(offerObj.shippingCost), locale, currency), 470, y, { width: 70, align: "right" });
    y += 15;
  }
  if (offerObj.discount) {
    doc.text(t("table.discount"), 370, y, { width: 100, align: "right" });
    doc.text(`- ${money(Number(offerObj.discount), locale, currency)}`, 470, y, { width: 70, align: "right" });
    y += 15;
  }

  doc.fontSize(12);
  doc.text(t("table.totalGross"), 370, y, { width: 100, align: "right" });
  doc.text(money(Number(offerObj.totalGross), locale, currency), 470, y, { width: 70, align: "right" });
  y += 32;

  // 10) Notlar
  doc.fontSize(9);
  const payTerms = safeTL(offerObj.paymentTerms || emptyTL(), locale);
  const noteTL  = safeTL(offerObj.notes || emptyTL(), locale);
  if (payTerms) { doc.text(`${t("paymentTerms")}: ${s(payTerms)}`, 40, y); y += 12; }
  if (noteTL)   { doc.text(`${t("note")}: ${s(noteTL)}`, 40, y); y += 12; }
  doc.text(`${t("validUntil")}: ${offerObj.validUntil ? new Date(offerObj.validUntil).toLocaleDateString(loc) : ""}`, 40, y);
  y += 20;

  // 11) Footer
  doc.fontSize(8); fillCol(doc, "gray");
  if (company?.website) {
    doc.text(`Web: ${s(company.website)}`, 40, (doc as any).page.height - (doc as any).page.margins.bottom - 15, { width: 500, align: "left" });
  }

  // 12) finalize
  doc.end();
  const pdfBuffer = await done;

  // PDF doğrulaması
  if (!isValidPdf(pdfBuffer)) throw new Error("Generated PDF buffer is invalid (no %PDF header / %%EOF).");

  // 13) Storage
  const tenant = sanitizeTenant(offerObj.tenant || "default");
  const baseId = `offer_${slugify(offerObj.offerNumber)}_${Date.now()}`; // uzantısız
  const cloudFolder = `${CLOUD_ROOT}/${tenant}/offers`;

  if (STORAGE_PROVIDER === "cloudinary" && cloudOk()) {
    try {
      const url = await uploadBufferToCloudinary(pdfBuffer, {
        folder: cloudFolder,
        public_id: `${baseId}.pdf`,   // .pdf UZANTILI!
        resource_type: "raw",         // PDF için en doğrusu
      });
      if (url) return url;
    } catch { /* local fallback */ }
  }

  // Local fallback
  const offersDir = path.join(BASE_UPLOAD_DIR, tenant, "offers");
  fs.mkdirSync(offersDir, { recursive: true });
  const filePath = path.join(offersDir, `${baseId}.pdf`);
  fs.writeFileSync(filePath, pdfBuffer);
  const publicPath = filePath.replace(/^\.?\/*/, "").replace(/\\/g, "/");
  return `${BASE_URL}/${publicPath}`;
}
