// src/core/middleware/file/uploadTypeWrapper.ts

import { Request, Response, NextFunction } from "express";
import { UploadFolderKeys } from "./uploadMiddleware";

/**
 * Boyut limitleri (byte). Mevcudu koruyarak yeni modül anahtarları eklendi.
 * İhtiyaca göre rakamları ayarlayabilirsin.
 */
export const uploadSizeLimits: Record<UploadFolderKeys, number> = {
  // -- mevcutlar --
  profile: 5 * 1024 * 1024,
  product: 20 * 1024 * 1024,
  ensotekprod: 20 * 1024 * 1024,
  ensotekCategory: 20 * 1024 * 1024,
  bikes: 20 * 1024 * 1024,
  bikesCategory: 20 * 1024 * 1024,
  category: 10 * 1024 * 1024,
  news: 15 * 1024 * 1024,
  articles: 15 * 1024 * 1024,
  blog: 15 * 1024 * 1024,
  gallery: 30 * 1024 * 1024,
  services: 10 * 1024 * 1024,
  massage: 10 * 1024 * 1024,
  library: 50 * 1024 * 1024,
  references: 20 * 1024 * 1024,
  sport: 10 * 1024 * 1024,
  sparepart: 10 * 1024 * 1024,
  settings: 5 * 1024 * 1024,
  company: 5 * 1024 * 1024,
  default: 20 * 1024 * 1024,
  activity: 10 * 1024 * 1024,
  apartment: 15 * 1024 * 1024,
  tenant: 20 * 1024 * 1024,
  coupons: 10 * 1024 * 1024,
  about: 10 * 1024 * 1024,
  galleryCategory: 30 * 1024 * 1024,
  sparepartCategory: 30 * 1024 * 1024,
  team: 30 * 1024 * 1024,
  portfolio: 30 * 1024 * 1024,
  skill: 10 * 1024 * 1024,
  servicecatalog: 20 * 1024 * 1024,

  // -- yeni modüller (Apartment projesi) --
  /**
   * Genel dosya modülü; image/pdf/doc hepsi buradan geçebilir.
   * (Admin Files/Docs için kullandığımız route’larda uploadTypeWrapper("files") kullanıyoruz.)
   */
  files: 50 * 1024 * 1024,

  /** Doküman odaklı yüklemeler için ayrı anahtar kullanmak istersen */
  documents: 50 * 1024 * 1024,

  /** Sözleşme ekleri (PDF vb.) */
  contracts: 25 * 1024 * 1024,

  /** Fatura ekleri (PDF, çıktılar) */
  invoices: 20 * 1024 * 1024,

  /** Ödeme dekontları */
  payments: 20 * 1024 * 1024,

  /** Gider fiş/fatura görselleri (mobil foto/scan) */
  expenses: 30 * 1024 * 1024,

  /** Operasyon şablonlarına ait görseller/dosyalar */
  operationtemplates: 20 * 1024 * 1024,

  /** İş emri fotoğrafları (saha) */
  operationsjobs: 30 * 1024 * 1024,

  /** Personel avatar/evrakları */
  employees: 10 * 1024 * 1024,

  /** Contact/Organization logolar/evraklar */
  contacts: 10 * 1024 * 1024,

  /** Price list içe aktarımları / PDF çıktıları */
  pricelist: 10 * 1024 * 1024,

  /** Rapor PDF/CSV çıktıları */
  reports: 30 * 1024 * 1024,

  /** Banka ekstresi/CSV (Cashbook) için istersen ayır */
  cashbook: 30 * 1024 * 1024,
};

export const uploadTypeWrapper = (type: UploadFolderKeys) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = type;
    req.uploadSizeLimit = uploadSizeLimits[type] || uploadSizeLimits.default;
    // İstersen logger ile de yazabilirsin; mevcut console çıktısını korudum.
    console.log(`[UPLOAD TYPE WRAPPER] type: ${type}, limit: ${req.uploadSizeLimit}`);
    next();
  };
};
