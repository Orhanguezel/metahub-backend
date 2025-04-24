import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

import { Company } from "@/modules/company";
import { IInvoice } from "@/modules/invoice";

// 📌 Vergi Hesaplama Fonksiyonu
export const calculateTax = (totalAmount: number, taxRate = 19) => {
  const taxAmount = parseFloat(((totalAmount * taxRate) / 100).toFixed(2));
  const finalAmount = parseFloat((totalAmount + taxAmount).toFixed(2));
  return { taxAmount, finalAmount };
};

// 📌 Şirket Bilgilerini Getir
export const getCompanyInfo = async () => {
  const company = await Company.findOne();
  if (!company) throw new Error("🚨 Company info not found");
  return company;
};

// 📌 PDF Fatura Oluştur
export const generateInvoicePDF = async (
  invoice: IInvoice & { user: any; company: any }
): Promise<string> => {
  const doc = new PDFDocument();
  const fileName = `invoice-${invoice.invoiceNumber}.pdf`;

  // Ortam değişkeni destekli PDF kaydetme dizini
  const invoicesDir = path.join(process.cwd(), process.env.INVOICE_PATH || "public/invoices");

  // 📁 Klasör yoksa oluştur
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const filePath = path.join(invoicesDir, fileName);
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // 🔹 Başlık ve temel bilgiler
  doc.fontSize(20).text("INVOICE", { align: "center" }).moveDown();
  doc.fontSize(12)
    .text(`Invoice No: ${invoice.invoiceNumber}`)
    .text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString()}`)
    .text(`Customer: ${invoice.user?.name || "-"}`)
    .text(`Email: ${invoice.user?.email || "-"}`)
    .moveDown();

  // 🔹 Şirket bilgileri
  if (invoice.company) {
    const { companyName, address, phone, email, taxNumber, handelsregisterNumber } = invoice.company;
    doc.text(`Company: ${companyName}`)
      .text(`Address: ${address?.street}, ${address?.city}`)
      .text(`Phone: ${phone}`)
      .text(`Email: ${email}`)
      .text(`Tax No: ${taxNumber}`)
      .text(`Handelsregister: ${handelsregisterNumber || "-"}`)
      .moveDown();
  }

  // 🔹 Ürün kalemleri
  invoice.items.forEach((item, index) => {
    doc.text(`${index + 1}. ${item.name}`);
    doc.text(`   Quantity: ${item.quantity}`);
    doc.text(`   Unit Price: €${item.unitPrice.toFixed(2)}`);
    doc.moveDown();
  });

  // 🔹 Toplam
  doc.text(`Total: €${invoice.totalAmount.toFixed(2)}`);
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", (err) => reject(`PDF oluşturulamadı: ${err.message}`));
  });
};
// 📌 PDF Faturayı İndir