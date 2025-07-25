import { Request, Response, NextFunction } from "express";
import { UploadFolderKeys } from "./uploadMiddleware";

export const uploadSizeLimits: Record<UploadFolderKeys, number> = {
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
  galleryCategory: 30 * 1024 * 1024, // New limit for gallery categories
  sparepartCategory: 30 * 1024 * 1024, // New limit for spareparts categories
};

export const uploadTypeWrapper = (type: UploadFolderKeys) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = type;
    req.uploadSizeLimit = uploadSizeLimits[type] || uploadSizeLimits.default;
    console.log(
      `[UPLOAD TYPE WRAPPER] type: ${type}, limit: ${req.uploadSizeLimit}`
    );
    next();
  };
};
