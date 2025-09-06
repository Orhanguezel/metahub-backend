// src/core/utils/i18n/fillAllLocales.ts
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/recipes/common";

/** Logger ve fallback dil belirleyici */
export function getLogLocale(): SupportedLocale {
  const envLocale = process.env.LOG_LOCALE as SupportedLocale;
  return SUPPORTED_LOCALES.includes(envLocale) ? envLocale : "en";
}
