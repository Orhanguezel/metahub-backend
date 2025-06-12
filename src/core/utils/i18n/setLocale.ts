// src/core/utils/i18n/setLocale.ts
import { Request, Response, NextFunction } from "express";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

/** Request için locale belirler (query → body → header → .env → en) */
export const setLocale = (req: Request, _res: Response, next: NextFunction) => {
  let locale = req.query.locale as SupportedLocale | undefined;

  if (!locale && typeof req.body?.locale === "string") {
    locale = req.body.locale as SupportedLocale;
  }

  if (!locale && typeof req.headers["accept-language"] === "string") {
    const langHeader = req.headers["accept-language"].toLowerCase();
    locale = SUPPORTED_LOCALES.find((code) => langHeader.startsWith(code));
  }

  if (!locale) {
    locale = (process.env.LOG_LOCALE as SupportedLocale) || "en";
  }

  req.locale = locale;
  next();
};
