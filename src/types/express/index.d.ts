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
      tenantData?: any;
      logger: import("winston").Logger;
      enabledModules?: string[];

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
        isSuperadmin?: boolean;
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
        | "ensotekCategory"
        | "ensotekprod"
        | "category"
        | "blog"
        | "gallery"
        | "galleryCategory"
        | "services"
        | "massage"
        | "activity"
        | "library"
        | "references"
        | "news"
        | "articles"
        | "about"
        | "sport"
        | "sparepart"
        | "sparepartCategory"
        | "settings"
        | "company"
        | "apartment"
        | "tenant"
        | "coupons"
        | "team"
        | "portfolio"
        | "skill"
        | "apartment"
        | "servicecatalog"
        | "files"
        | "documents"
        | "contracts"
        | "invoices"
        | "payments"
        | "expenses"
        | "operationtemplates"
        | "operationsjobs"
        | "employees"
        | "contacts"
        | "pricelist"
        | "reports"
        | "cashbook"
        | "menucategory"
        | "menuitem"
        | "menu"
        | "recipe"
        | "default";


      uploadSizeLimit?: number;

      // 🧩 Tenant-aware model erişimi
      getModel: <T = any>(name: string, schema: Schema<T>) => Promise<Model<T>>;
    }
  }

  // 🎫 Token tipi (opsiyonel alanları destekler)
  interface IUserToken extends Express.Request["user"] {}
}

export interface UserPayload {
  id: string;
  _id?: string;
  role: "superadmin" | "admin" | "user" | "customer" | "moderator" | "staff";
  email?: string;
  name?: string;
  isActive?: boolean;
  isSuperadmin?: boolean;
  iat?: number;
  exp?: number;
}


export {};
