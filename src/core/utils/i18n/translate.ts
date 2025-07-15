import { fillAllLocales } from "./fillAllLocales";
import type { SupportedLocale } from "@/types/common";

/**
 * i18n çeviri fonksiyonu (safe, parametreli ve future-proof)
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

  if (vars && typeof str === "string") {
    for (const [k, v] of Object.entries(vars)) {
      // key boşsa veya undefined'sa regex oluşturma!
      if (!k) continue;
      try {
        str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
      } catch (err) {
        // Eğer regex hatası olursa, o değişkeni atla
        continue;
      }
    }
  }

  return str;
}

export { fillAllLocales };
