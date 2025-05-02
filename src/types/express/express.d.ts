import "./types/express/express";

export interface UserPayload {
  id: string;
  _id?: string;
  role: "admin" | "user" | "customer" | "moderator" | "staff";
  email?: string;
  name?: string;
  isActive?: boolean;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      uploadType?:
        | "profile"
        | "product"
        | "category"
        | "blog"
        | "gallery"
        | "service"
        | "library"
        | "references"
        | "news"
        | "article"
        | "sport"
        | "spareparts"
        | "default";

      locale?: "tr" | "en" | "de"; // 🌍 Çok dilli destek (i18n)
    }
  }

  interface IUserToken extends UserPayload {}
}

export {};
