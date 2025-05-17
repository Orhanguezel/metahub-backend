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
        | "sport"
        | "spareparts"
        | "setting"
        | "company"
        | "about"
        | "default";
    }
  }
}

export {};
