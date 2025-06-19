import { fillAllLocales } from "./fillAllLocales";
import type { SupportedLocale } from "@/types/common";

/**
 * i18n çeviri fonksiyonu
 * - Modül i18n dosyasından alır
 * - `t("key", "de", translations, { name: "Test" })`
 */
export function t(
  key: string,
  locale: SupportedLocale,
  translations: Record<SupportedLocale, any>,
  vars?: Record<string, string | number>
): string {
  let str = translations[locale]?.[key] || translations["en"]?.[key] || key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
    }
  }

  return str;
}

export { fillAllLocales };

