// src/core/utils/i18n/mergeLocalesForUpdate.ts
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { fillAllLocales } from "./fillAllLocales";

type TL = Partial<Record<SupportedLocale, string>>;
type TLFull = Record<SupportedLocale, string>;

/**
 * current: DB’deki mevcut değerler (Partial olabilir)
 * incoming: kısmi/tek dil/JSON string olabilir → fillAllLocales ile tamamlanır
 * Dönüş: tüm diller dolu Record
 */
export function mergeLocalesForUpdate(
  current: TL | undefined,
  incoming: unknown
): TLFull {
  const filledCurrent  = fillAllLocales(current || {});
  const filledIncoming = fillAllLocales(
    typeof incoming === "string" ? safeParse(incoming) : (incoming as TL) || {}
  );

  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    const inc = filledIncoming[lang];
    acc[lang] =
      typeof inc === "string" && inc.trim()
        ? inc
        : (filledCurrent[lang] || "");
    return acc;
  }, {} as TLFull);
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}
