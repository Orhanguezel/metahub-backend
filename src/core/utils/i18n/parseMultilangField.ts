import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { fillAllLocales } from "./fillAllLocales";
export { fillAllLocales };

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
