import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

export function fillAllLocales(input: any): Record<SupportedLocale, string> {
  // input tamamen eksikse → tüm diller boş
  if (
    !input ||
    (typeof input === "object" && Object.keys(input).length === 0)
  ) {
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = "";
      return acc;
    }, {} as Record<SupportedLocale, string>);
  }

  // input bir string ise → hepsine ata
  if (typeof input === "string") {
    const val = input.trim();
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = val;
      return acc;
    }, {} as Record<SupportedLocale, string>);
  }

  // input bir object ise → eksikleri ilk geçerli ile doldur
  const firstValidValue: string =
    Object.values(input).find(
      (v): v is string => typeof v === "string" && Boolean(v.trim())
    ) || "";

  const filled: Record<SupportedLocale, string> = {} as Record<
    SupportedLocale,
    string
  >;

  for (const lang of SUPPORTED_LOCALES) {
    const val = input?.[lang];
    filled[lang] =
      typeof val === "string" && val.trim() ? val.trim() : firstValidValue;
  }

  return filled;
}
