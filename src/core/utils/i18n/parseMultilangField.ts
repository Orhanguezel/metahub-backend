// src/core/utils/i18n/parseMultilangField.ts
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

/**
 * Fills all locales based on the first valid input.
 * - Accepts string or partial locale object
 * - Returns all locales filled
 */
export function fillAllLocales(input: any): Record<SupportedLocale, string> {
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

  const firstValid = SUPPORTED_LOCALES.map((l) => input[l]).find(
    (v) => typeof v === "string" && v.trim()
  );

  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    const val = input[lang];
    acc[lang] =
      typeof val === "string" && val.trim() ? val.trim() : firstValid || "";
    return acc;
  }, {} as Record<SupportedLocale, string>);
}

// Tek alan: label, description vs.
export function parseMultilangField(input: any) {
  return fillAllLocales(input);
}

// Çoklu alan: { label, description, ... }
export function fillFields(obj: any, fields: string[]) {
  for (const field of fields) {
    if (obj[field]) obj[field] = fillAllLocales(obj[field]);
  }
  return obj;
}

// normalize + tüm dilleri doldur
export function normalizeMultilangField(
  input: any
): Record<SupportedLocale, string> {
  return fillAllLocales(input);
}

// sadece belirli locale için string döner
export function extractMultilangValue(
  field: Record<SupportedLocale, string>,
  locale: SupportedLocale
): string {
  if (!field || typeof field !== "object") return "";
  return field[locale] || "";
}
