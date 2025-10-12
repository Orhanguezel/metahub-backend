// src/core/utils/i18n/mergeLocalesArrayForUpdate.ts
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

const toArray = (v: any): string[] => {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === "string") {
    if (v.includes(",")) return v.split(",").map(s => s.trim()).filter(Boolean);
    const s = v.trim();
    return s ? [s] : [];
  }
  return [];
};

const uniqLower = (arr: string[]) =>
  Array.from(new Set(arr.map(s => s.toLowerCase()).filter(Boolean)));

export function mergeLocalesArrayForUpdate(
  current: Partial<Record<SupportedLocale, string[]>> = {},
  incoming: any = {},
  fallbackLocale?: SupportedLocale
): Record<SupportedLocale, string[]> {
  // incoming i18n değilse → fallback diline yaz
  const normalizedIncoming: Partial<Record<SupportedLocale, string[]>> =
    (incoming && typeof incoming === "object" && !Array.isArray(incoming))
      ? incoming
      : { [fallbackLocale as SupportedLocale]: toArray(incoming) };

  const base: SupportedLocale | undefined =
    (fallbackLocale as SupportedLocale) ||
    (Object.keys(normalizedIncoming) as SupportedLocale[]).find(
      l => (normalizedIncoming as any)[l]?.length
    );

  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    const inc = toArray((normalizedIncoming as any)[lang]);
    const cur = Array.isArray(current[lang]) ? current[lang]! : [];

    // Eğer bu dil boşsa base dilin değerleri ile doldur
    const baseArr = base ? toArray((normalizedIncoming as any)[base]) : [];

    const merged = inc.length ? inc : (cur.length ? cur : baseArr);
    acc[lang] = uniqLower(merged);
    return acc;
  }, {} as Record<SupportedLocale, string[]>);
}
