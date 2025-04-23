// src/types/express/index.d.ts

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
      locale?: "tr" | "en" | "de";
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
        | "default";
    }
  }

  interface IUserToken extends UserPayload {}
}

export {};
