// src/core/pdf/addLogoToPdf.ts

import PDFDocument from "pdfkit";

/**
 * Logo buffer'ı PDFKit dokümanına ekler.
 * - Logo yoksa hiçbir şey yapmaz.
 * - PDF üzerinde konumunu, boyutunu ayarlayabilirsin.
 * @param doc PDFDocument
 * @param logoBuffer Buffer
 * @param x number (varsayılan: 430)
 * @param y number (varsayılan: 35)
 * @param width number (varsayılan: 85)
 */
export function addLogoToPdf(doc: any, logoBuffer?: Buffer,
  x = 430,
  y = 35,
  width = 85
) {
  if (!logoBuffer) return;
  try {
    doc.image(logoBuffer, x, y, { width });
  } catch (err) {
    console.error("PDF'e logo eklenemedi:", err);
  }
}

