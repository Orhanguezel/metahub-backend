// 🌍 Desteklenen diller
export const SUPPORTED_LOCALES = ["tr", "en", "de", "pl", "fr", "es"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// 🏷️ Çok dilli etiket tipi
export type TranslatedLabel = Record<SupportedLocale, string>;
