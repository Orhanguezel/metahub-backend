// src/types/express/index.d.ts
import { File as MulterFile } from "multer";

declare global {
  namespace Express {
    interface Request {
      file?: MulterFile;
      files?: MulterFile[];
      user?: {
        id: string;
        _id?: string;
        role: "admin" | "user" | "customer" | "moderator" | "staff";
        email?: string;
        name?: string;
        isActive?: boolean;
        iat?: number;
        exp?: number;
      };
      uploadType?:
        | "profile"
        | "product"
        | "ensotekprod"
        | "radonarprod"
        | "category"
        | "blog"
        | "gallery"
        | "services"
        | "activity"
        | "library"
        | "references"
        | "news"
        | "articles"
        | "about"
        | "sport"
        | "spareparts"
        | "setting"
        | "company"
        | "default";
      uploadSizeLimit?: number;
      locale?: "tr" | "en" | "de";
    }
  }

  interface IUserToken extends Express.Request["user"] {}
}

export {};
