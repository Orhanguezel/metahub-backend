import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogoBuffer } from "./getLogoBuffer";
import { addLogoToPdf } from "./addLogoToPdf";
import { uploadBufferToCloudinary } from "./uploadBufferToCloudinary";

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "cloudinary";
const BASE_UPLOAD_DIR = process.env.UPLOAD_ROOT || "uploads";
const BASE_URL = process.env.BASE_URL || "http://localhost:5019";
const localeMap: Record<SupportedLocale, string> = {
  de: "de-DE", en: "en-US", tr: "tr-TR", fr: "fr-FR", es: "es-ES", pl: "pl-PL",
};

// Gelişmiş karakter temizleyici (artık Unicode font olduğu için gereksiz ama leave it for dirty input)
function sanitizeText(text: any) {
  if (!text) return "-";
  return String(text);
}

function getLogoPngUrl(logoImg: any): string | undefined {
  const webp = logoImg.webp || logoImg.url || logoImg.thumbnail;
  if (!webp) return undefined;
  if (webp.endsWith(".webp")) return webp.replace(/\.webp$/, ".png");
  return webp;
}

export async function generateOfferPdf(
  offerObj: any,
  company: any,
  customer: any,
  locale: SupportedLocale
): Promise<string> {
  // 1️⃣ LOGO buffer’ı (en başta)
  let logoPath: string | undefined;
if (company && Array.isArray(company.images) && company.images.length > 0) {
  logoPath = getLogoPngUrl(company.images[0]);
}
// Sonrası: logo yoksa logosuz PDF üret
const logoBuffer = await getLogoBuffer(logoPath);

  // 2️⃣ PDF'i buffer’a üret (Font Register)
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // ---- FONT REGISTER ----
  const fontPath = path.join(process.cwd(), "src/core/pdf/fonts/DejaVuSans.ttf");
  doc.registerFont("dejavu", fontPath);
  doc.font("dejavu");

  const buffers: Buffer[] = [];
  doc.on("data", (chunk) => buffers.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });

  const loc = localeMap[locale] || "de-DE";
  const t = (key: string, params?: any) => sanitizeText(translate(key, locale, translations, params));
  const currency = offerObj.currency || "EUR";
  const now = new Date();

  // --- LOGO sağ üst ---
  if (logoBuffer) {
    addLogoToPdf(doc, logoBuffer, 430, 35, 95);
  }

  // --- Şirket Bilgileri (Sol Üst) ---
  const companyName =
  company && company.companyName
    ? typeof company.companyName === "object"
      ? company.companyName[locale] || company.companyName["en"] || Object.values(company.companyName)[0]
      : company.companyName
    : "Firma seçilmemiş";

doc.font("dejavu").fontSize(17).text(companyName, 40, 40);

  doc.font("dejavu").fontSize(12);
  if (company.email) doc.text(sanitizeText(company.email), 40);
  if (company.phone) doc.text(sanitizeText(company.phone), 40);
  doc.font("dejavu").fontSize(9);
  if (company.website) doc.text(sanitizeText(company.website), 40);
  if (company.address && typeof company.address === "object") {
    const a = company.address;
    doc.text(
      sanitizeText([a.street, `${a.postalCode} ${a.city}`, a.country].filter(Boolean).join(", ")),
      40
    );
  }
  // --- Banka Bilgileri ---
  if (company.bankDetails) {
    if (company.bankDetails.bankName)
      doc.text(`Bank: ${sanitizeText(company.bankDetails.bankName)}`, 40);
    if (company.bankDetails.iban)
      doc.text(`IBAN: ${sanitizeText(company.bankDetails.iban)}`, 40);
    if (company.bankDetails.swiftCode)
      doc.text(`SWIFT/BIC: ${sanitizeText(company.bankDetails.swiftCode)}`, 40);
  }
  // --- Vergi vs ---
  if (company.taxNumber)
    doc.text(`${t("taxNumber")}: ${sanitizeText(company.taxNumber)}`, 40);
  if (company.handelsregisterNumber)
    doc.text(`${t("registerNumber")}: ${sanitizeText(company.handelsregisterNumber)}`, 40);
  if (company.registerCourt)
    doc.text(`${t("registerCourt")}: ${sanitizeText(company.registerCourt)}`, 40);

  // --- Sağ üstte: Tarih ve Teklif No, LOGO ALTINA hizalı ---
  doc.font("dejavu").fontSize(10)
    .text(`${t("date")}: ${now.toLocaleDateString(loc)}`, 420, 140, { align: "right" })
    .text(`${t("offerNumber")}: ${sanitizeText(offerObj.offerNumber)}`, 420, 155, { align: "right" });

  // --- Müşteri Bilgileri ---
  doc.moveDown(0.7);
  doc.font("dejavu").fontSize(12).text(`${t("customer")}:`, 40);
  doc.font("dejavu").fontSize(10);
  doc.text(
    typeof customer.companyName === "object"
      ? sanitizeText(customer.companyName[locale] || customer.companyName["en"] || Object.values(customer.companyName)[0])
      : sanitizeText(customer.companyName || ""), 40
  );
  if (customer.contactName) doc.text(sanitizeText(customer.contactName), 40);
  if (customer.address) {
    const a = customer.address;
    doc.text(
      sanitizeText([a.street, `${a.postalCode} ${a.city}`, a.country].filter(Boolean).join(", ")), 40
    );
  }
  if (customer.email) doc.text(sanitizeText(customer.email), 40);
  if (customer.phone) doc.text(sanitizeText(customer.phone), 40);

  // --- Başlık ve giriş ---
  doc.moveDown();
  doc.font("dejavu").fontSize(16).text(t("offerTitle"), 40);
  doc.moveDown(0.5);
  doc.font("dejavu").fontSize(10).text(t("introParagraph"), 40);
  doc.moveDown();

  // --- Ürün Tablosu ---
  const tableTop = doc.y;
  const itemRowHeight = 20;
  doc.font("dejavu").fontSize(10);
  doc.text(t("table.pos"), 40, tableTop);
  doc.text(t("table.product"), 70, tableTop);
  doc.text(t("table.qty"), 300, tableTop, { width: 50 });
  doc.text(t("table.unitPrice"), 370, tableTop, { width: 60, align: "right" });
  doc.text(t("table.total"), 440, tableTop, { width: 70, align: "right" });
  doc.moveTo(40, tableTop + 15).lineTo(540, tableTop + 15).stroke();
  doc.font("dejavu").fontSize(10);

  let y = tableTop + 20;
  offerObj.items.forEach((item: any, idx: number) => {
    const pname =
      typeof item.productName === "object"
        ? sanitizeText(item.productName[locale] || item.productName["en"] || Object.values(item.productName)[0])
        : sanitizeText(item.productName);
    doc.text(String(idx + 1), 40, y);
    doc.text(pname, 70, y, { width: 220 });
    doc.text(`${item.quantity}`, 300, y, { width: 50 });
    doc.text(
      `${Number(item.unitPrice).toLocaleString(loc, { minimumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`,
      370, y, { width: 60, align: "right" }
    );
    doc.text(
      `${Number(item.total).toLocaleString(loc, { minimumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`,
      440, y, { width: 70, align: "right" }
    );
    y += itemRowHeight;
  });
  doc.moveTo(40, y).lineTo(540, y).stroke();

  // --- Toplamlar ---
  y += 5;
  doc.font("dejavu").fontSize(11);
  doc.text(t("table.subtotal"), 370, y, { width: 100, align: "right" });
  doc.text(
    `${Number(offerObj.totalNet).toLocaleString(loc, { minimumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`,
    470, y, { width: 70, align: "right" }
  );
  y += 18;
  doc.font("dejavu").fontSize(10);
  doc.text(
    `${t("table.vat")} ${offerObj.items[0]?.vat || 19}%`,
    370, y, { width: 100, align: "right" }
  );
  doc.text(
    `${Number(offerObj.totalVat).toLocaleString(loc, { minimumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`,
    470, y, { width: 70, align: "right" }
  );
  y += 15;

  if (offerObj.shippingCost) {
    doc.text(t("table.shipping"), 370, y, { width: 100, align: "right" });
    doc.text(
      `${Number(offerObj.shippingCost).toLocaleString(loc, { minimumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`,
      470, y, { width: 70, align: "right" }
    );
    y += 15;
  }
  if (offerObj.discount) {
    doc.text(t("table.discount"), 370, y, { width: 100, align: "right" });
    doc.text(
      `- ${Number(offerObj.discount).toLocaleString(loc, { minimumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`,
      470, y, { width: 70, align: "right" }
    );
    y += 15;
  }

  doc.font("dejavu").fontSize(12);
  doc.text(t("table.totalGross"), 370, y, { width: 100, align: "right" });
  doc.text(
    `${Number(offerObj.totalGross).toLocaleString(loc, { minimumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`,
    470, y, { width: 70, align: "right" }
  );
  y += 32;

  // --- Notlar ve Şartlar ---
  doc.font("dejavu").fontSize(9);
  if (offerObj.paymentTerms && offerObj.paymentTerms[locale]) {
    doc.text(`${t("paymentTerms")}: ${sanitizeText(offerObj.paymentTerms[locale])}`, 40, y);
    y += 12;
  }
  if (offerObj.notes && offerObj.notes[locale]) {
    doc.text(`${t("note")}: ${sanitizeText(offerObj.notes[locale])}`, 40, y);
    y += 12;
  }
  doc.text(
    `${t("validUntil")}: ${offerObj.validUntil ? new Date(offerObj.validUntil).toLocaleDateString(loc) : ""}`,
    40, y
  );
  y += 20;

  // --- FOOTER (SADECE WEBSITE) ---
  doc.fontSize(8).fillColor("gray");
  let footerY = 765;
  if (company.website) {
    doc.text(`Web: ${sanitizeText(company.website)}`, 40, footerY, { width: 500, align: "left" });
  }

  doc.end();
  const pdfBuffer = await done;

  if (STORAGE_PROVIDER === "cloudinary") {
    const folder = `offers/${offerObj.tenant}`;
    const public_id = `offer_${offerObj.offerNumber}_${Date.now()}`;
    const url = await uploadBufferToCloudinary(pdfBuffer, {
      folder,
      public_id,
      resource_type: "raw",
    });
    return url;
  } else {
    const tenant = offerObj.tenant || "default";
    const offersDir = path.join(BASE_UPLOAD_DIR, tenant, "offers");
    if (!fs.existsSync(offersDir)) fs.mkdirSync(offersDir, { recursive: true });
    const fileName = `offer_${offerObj.offerNumber}_${Date.now()}.pdf`;
    const filePath = path.join(offersDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    return (
      BASE_URL.replace(/\/$/, "") +
      "/" +
      filePath.replace(/^\.?\/*/, "").replace(/\\/g, "/")
    );
  }
}
