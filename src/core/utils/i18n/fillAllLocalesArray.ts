// src/core/utils/i18n/fillAllLocalesArray.ts

import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

// Tüm locale'lerde array doldurur
export function fillAllLocalesArray(
  input: any,
  preferredLang: SupportedLocale = "en"
): Record<SupportedLocale, string[]> {
  if (!input || typeof input === "undefined") {
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = [];
      return acc;
    }, {} as Record<SupportedLocale, string[]>);
  }
  if (Array.isArray(input)) {
    // Tek dilde array gönderilmişse her dile aynısını ata
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = input;
      return acc;
    }, {} as Record<SupportedLocale, string[]>);
  }
  if (typeof input !== "object") {
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = [];
      return acc;
    }, {} as Record<SupportedLocale, string[]>);
  }
  // Her dilde string[] olarak doldur
  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    const val = input[lang];
    if (Array.isArray(val)) acc[lang] = val.filter(Boolean);
    else if (typeof val === "string" && val.trim()) acc[lang] = [val.trim()];
    else acc[lang] = [];
    return acc;
  }, {} as Record<SupportedLocale, string[]>);
}
