declare module "pdfkit" {
  import { Writable } from "stream";

  /** Modül içi tipler (opsiyonlar vb.) */
  namespace PDFKit {
    interface PDFDocumentOptions {
      size?: "A4" | "A3" | "A5" | [number, number] | string;
      margin?: number;
      margins?: { top?: number; left?: number; bottom?: number; right?: number };
      info?: Record<string, any>;
    }

    interface PDFPage {
      width: number;
      height: number;
      margins: { top: number; left: number; bottom: number; right: number };
    }

    interface ImageOptions {
      width?: number;
      height?: number;
      align?: "left" | "center" | "right";
      valign?: "top" | "center" | "bottom";
    }

    namespace Mixins {
      interface TextOptions {
        width?: number;
        align?: "left" | "center" | "right" | "justify";
      }
    }
  }

  /** Varsayılan export edilen sınıf */
  class PDFDocument extends Writable {
    constructor(options?: PDFKit.PDFDocumentOptions);

    image(src: Buffer | string, x?: number, y?: number, options?: PDFKit.ImageOptions): this;
    text(text: string, x?: number, y?: number, options?: PDFKit.Mixins.TextOptions): this;

    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(): this;

    registerFont(name: string, src: string | Buffer): this;
    font(id: string | Buffer): this;
    fontSize(size: number): this;

    addPage(options?: PDFKit.PDFDocumentOptions): this;
    end(): void;

    readonly page: PDFKit.PDFPage;
  }

  /** Sınıf default export, tipler de ad alanı olarak dışarı verilir */
  export default PDFDocument;
  export { PDFKit };
}
