// src/core/utils/i18n/mergeLocalesForUpdate.ts

import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { fillAllLocales } from "./fillAllLocales";

export function mergeLocalesForUpdate(
  current: Record<SupportedLocale, string>,
  incoming: any
): Record<SupportedLocale, string> {
  const filledIncoming = fillAllLocales(incoming);
  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    acc[lang] =
      typeof filledIncoming[lang] === "string" && filledIncoming[lang].trim()
        ? filledIncoming[lang]
        : current[lang] || "";
    return acc;
  }, {} as Record<SupportedLocale, string>);
}
