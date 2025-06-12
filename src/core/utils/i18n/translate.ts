
// src/core/utils/i18n/translate.ts
import type { SupportedLocale } from "@/types/common";


export function t(
  key: string,
  locale: SupportedLocale,
  translations: Record<SupportedLocale, any>,
  vars?: Record<string, string | number>
): string {
  let str = translations[locale]?.[key] || translations["en"]?.[key] || key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
    });
  }
  return str;
}
