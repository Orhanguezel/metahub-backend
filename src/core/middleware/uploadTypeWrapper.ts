import { Request, Response, NextFunction } from "express";
import { UploadFolderKeys } from "./uploadMiddleware";

export const uploadSizeLimits: Record<UploadFolderKeys, number> = {
  profile: 5 * 1024 * 1024,
  product: 20 * 1024 * 1024,
  ensotekprod: 20 * 1024 * 1024,
  radonarprod: 20 * 1024 * 1024,
  category: 10 * 1024 * 1024,
  news: 15 * 1024 * 1024,
  articles: 15 * 1024 * 1024,
  blog: 15 * 1024 * 1024,
  gallery: 30 * 1024 * 1024,
  services: 10 * 1024 * 1024,
  library: 50 * 1024 * 1024,
  references: 20 * 1024 * 1024,
  sport: 10 * 1024 * 1024,
  spareparts: 10 * 1024 * 1024,
  setting: 5 * 1024 * 1024,
  company: 5 * 1024 * 1024,
  default: 20 * 1024 * 1024,
  activity: 10 * 1024 * 1024,
  about: 10 * 1024 * 1024,
  
};

export const uploadTypeWrapper = (type: UploadFolderKeys) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = type;
    req.uploadSizeLimit = uploadSizeLimits[type] || uploadSizeLimits.default;
    console.log(`[UPLOAD TYPE WRAPPER] type: ${type}, limit: ${req.uploadSizeLimit}`);
    next();
  };
};
