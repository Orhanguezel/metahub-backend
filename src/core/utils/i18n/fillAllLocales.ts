// src/core/utils/i18n/translate.ts
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

/**
 * Fills all locales based on the first valid input.
 * - Accepts string or partial locale object
 * - Returns all locales filled
 */
export function fillAllLocales(
  input: any,
  preferredLang: SupportedLocale = "en"
): Record<SupportedLocale, string> {
  if (!input || typeof input === "undefined") {
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = "";
      return acc;
    }, {} as Record<SupportedLocale, string>);
  }

  if (typeof input === "string") {
    const val = input.trim();
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = val;
      return acc;
    }, {} as Record<SupportedLocale, string>);
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = "";
      return acc;
    }, {} as Record<SupportedLocale, string>);
  }

  const preferred = input[preferredLang]?.trim();
  const firstValid = SUPPORTED_LOCALES.map((l) => input[l]).find(
    (v) => typeof v === "string" && v.trim()
  );

  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    const val = input[lang];
    acc[lang] =
      typeof val === "string" && val.trim()
        ? val.trim()
        : preferred || firstValid || "";
    return acc;
  }, {} as Record<SupportedLocale, string>);
}
