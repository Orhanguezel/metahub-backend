// 🌍 Desteklenen diller
export const SUPPORTED_LOCALES = ["tr", "en", "de", "pl", "fr", "es"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// 🏷️ Çok dilli etiket tipi
export type TranslatedLabel = Record<SupportedLocale, string>;

export function getDateLocale(locale: SupportedLocale) {
  switch (locale) {
    case "tr": return "tr-TR";
    case "en": return "en-US";
    case "de": return "de-DE";
    case "fr": return "fr-FR";
    case "es": return "es-ES";
    case "pl": return "pl-PL";
    default: return "en-US";
  }
}
