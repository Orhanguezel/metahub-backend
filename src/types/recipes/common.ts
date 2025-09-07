// 🌍 Desteklenen diller (tenant'a özel 10 dil)
export const SUPPORTED_LOCALES = [
  "tr", // Türkçe
  "en", // English
  "fr", // Français
  "de", // Deutsch
  "it", // Italiano
  "pt", // Português
  "ar", // العربية
  "ru", // Русский
  "zh", // 中文 (简体)
  "hi", // हिन्दी
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// 🏷️ Çok dilli etiket tipi
export type TranslatedLabel = Record<SupportedLocale, string>;

export function getDateLocale(locale: SupportedLocale) {
  switch (locale) {
    case "tr": return "tr-TR";
    case "en": return "en-US";
    case "fr": return "fr-FR";
    case "de": return "de-DE";
    case "it": return "it-IT";
    case "pt": return "pt-PT";
    case "ar": return "ar-SA";
    case "ru": return "ru-RU";
    case "zh": return "zh-CN";
    case "hi": return "hi-IN";
    default:   return "en-US";
  }
}
