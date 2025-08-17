import type PDFDocument from "pdfkit";

/**
 * Logo buffer'ı PDFKit dokümanına ekler.
 * - Logo yoksa hiçbir şey yapmaz.
 * - Konum/boyut ayarlanabilir.
 */
export function addLogoToPdf(
  doc: PDFDocument,   // <<< burada PDFKit.PDFDocument DEĞİL
  logoBuffer?: Buffer,
  x = 430,
  y = 35,
  width = 85
): void {
  if (!logoBuffer) return;
  try {
    doc.image(logoBuffer, x, y, { width });
  } catch {
    // loglamak istersen buraya logger ekleyebilirsin
  }
}
