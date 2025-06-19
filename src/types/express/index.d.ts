// src/types/express/index.d.ts
import { File as MulterFile } from "multer";
import type { SupportedLocale } from "./common";
import type { Model, Schema } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      file?: MulterFile;
      files?: MulterFile[];
      locale?: SupportedLocale;
      tenant?: string;
      logger: import("winston").Logger;

      // 👤 Auth bilgileri
      user?: {
        id: string;
        _id?: string;
        role:
          | "superadmin"
          | "admin"
          | "user"
          | "customer"
          | "moderator"
          | "staff";
        email?: string;
        name?: string;
        isActive?: boolean;
        iat?: number;
        exp?: number;
      };

      // 📁 Upload bilgileri
      uploadType?:
        | "profile"
        | "product"
        | "ensotekprod"
        | "bikes"
        | "bikesCategory"
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
        | "tenant"
        | "default";

      uploadSizeLimit?: number;

      // 🧩 Tenant-aware model erişimi
      getModel: <T = any>(name: string, schema: Schema<T>) => Promise<Model<T>>;
    }
  }

  // 🎫 Token tipi (opsiyonel alanları destekler)
  interface IUserToken extends Express.Request["user"] {}
}

export {};
