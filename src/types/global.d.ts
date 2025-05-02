// src/types/global.d.ts
import { UserPayload } from "./userPayload";

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
        | "spareparts"
        | "default";
    }
  }
}

export {};
