// src/types/common.d.ts
import type { SupportedLocale } from "./common"; // ts uzantılıdan alırsın

declare global {
  namespace Express {
    interface Request {
      locale?: SupportedLocale;
      // başka custom alanlar...
    }
  }
}
export {};
