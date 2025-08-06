import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

export function mergeLocalesArrayForUpdate(
  current: Partial<Record<SupportedLocale, string[]>> = {},
  incoming: any = {}
): Record<SupportedLocale, string[]> {
  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    // incoming[lang] array mi?
    if (Array.isArray(incoming[lang])) {
      acc[lang] = incoming[lang].filter((x: any) => typeof x === "string" && x.trim());
    }
    // incoming[lang] string ise array'e çevir
    else if (typeof incoming[lang] === "string" && incoming[lang].trim()) {
      acc[lang] = [incoming[lang]];
    }
    // current'ta varsa onu koru
    else if (Array.isArray(current[lang])) {
      acc[lang] = current[lang];
    } else {
      acc[lang] = [];
    }
    return acc;
  }, {} as Record<SupportedLocale, string[]>);
}
