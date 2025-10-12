import { File as MulterFile } from "multer";
import type { SupportedLocale } from "./common";
import type { Model, Schema } from "mongoose";
import type { AppRole } from "../roles"; // ← ortak rol tipini kullan

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

      // 👤 Auth bilgileri (tekli ve çoklu rol desteği)
      user?: {
        id: string;
        _id?: string;
        role: AppRole;          // zorunlu ana rol
        roles?: AppRole[];      // opsiyonel ek roller (RBAC için)
        email?: string;
        name?: string;
        isActive?: boolean;
        isSuperadmin?: boolean;
        // opsiyonel yardımcı alanlar
        scopes?: string[];      // OAuth/scopes tarzı
        permissions?: string[]; // route/service bazlı detay izinler
        iat?: number;
        exp?: number;
      };

      // 📁 Upload bilgileri (duplicate’ler temizlendi)
      uploadType?:
        | "profile"
        | "product"
        | "ensotekprod"
        | "ensotekCategory"
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
        | "aboutus"
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
        | "seller"
        | "default";

      uploadSizeLimit?: number;

      // 🧩 Tenant-aware model erişimi
      getModel: <T = any>(name: string, schema: Schema<T>) => Promise<Model<T>>;
    }
  }

  // 🎫 Token tipi (JWT payload ile hizalı)
  interface IUserToken extends Express.Request["user"] {}
}

// Dışarıya export edilen payload tipi
export interface UserPayload {
  id: string;
  _id?: string;
  role: AppRole;
  roles?: AppRole[];
  email?: string;
  name?: string;
  isActive?: boolean;
  isSuperadmin?: boolean;
  scopes?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export {};
