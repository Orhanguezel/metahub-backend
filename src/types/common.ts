// src/types/common.ts
// 🌍 Desteklenen diller
export const SUPPORTED_LOCALES = ["tr", "en", "de", "pl", "fr", "es", "it", "pt", "ar", "ru", "zh", "hi"] as const;

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
    case "it": return "it-IT";
    case "pt": return "pt-PT";
    case "ar": return "ar-SA";
    case "ru": return "ru-RU";
    case "zh": return "zh-CN";
    case "hi": return "hi-IN";
    default: return "en-US";
  }
}
