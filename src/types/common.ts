// src/types/common.ts
export const SUPPORTED_LOCALES = ["tr", "en", "de", "pl", "fr", "es"] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
export type TranslatedLabel = Record<SupportedLocale, string>;

