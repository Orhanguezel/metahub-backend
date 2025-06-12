
// src/core/utils/i18n/setLocale.ts
import { Request, Response, NextFunction } from "express";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// Daha esnek: query/body üzerinden de locale yakalar, fallback .env veya "en"
export const setLocale = (req: Request, _res: Response, next: NextFunction) => {
  // 1. Query param
  let locale = req.query.locale as SupportedLocale | undefined;
  // 2. Body (JSON POST ise)
  if (!locale && typeof req.body?.locale === "string") {
    locale = req.body.locale as SupportedLocale;
  }
  // 3. Header
  if (!locale) {
    const langHeader = req.headers["accept-language"]?.toString().toLowerCase() || "";
    locale = SUPPORTED_LOCALES.find((code) => langHeader.startsWith(code));
  }
  // 4. Fallback .env veya "en"
  if (!locale) {
    locale = (process.env.LOG_LOCALE as SupportedLocale) || "en";
  }

  req.locale = locale;
  next();
};
