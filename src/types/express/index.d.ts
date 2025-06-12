import { File as MulterFile } from "multer";
import type { SupportedLocale } from "../common";

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
        | "bikes"
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
        | "apartment"
        | "default";
      uploadSizeLimit?: number;
      locale?: SupportedLocale;
    }
  }

  interface IUserToken extends Express.Request["user"] {}
}

export {};
