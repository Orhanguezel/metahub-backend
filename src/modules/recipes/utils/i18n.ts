import { SUPPORTED_LOCALES, type SupportedLocale, type TranslatedLabel } from "@/types/recipes/common";
import { fillAllLocales } from "@/core/utils/i18n/recipes/fillAllLocales";

/** Mongoose çok dilli string alan şablonu (10 dil) */
export const localizedStringField = () => {
  const fields: Record<SupportedLocale, any> = {} as any;
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale as SupportedLocale] = { type: String, trim: true, default: "" };
  }
  return fields;
};

/** Çok dilli alan normalize (trim + opsiyonel lowercase) */
export const normalizeTranslatedLabel = (
  input: any,
  opts?: { lowercase?: boolean; trim?: boolean }
): TranslatedLabel => {
  const filled = fillAllLocales(input || {});
  const out = {} as TranslatedLabel;
  for (const lng of SUPPORTED_LOCALES) {
    let v = String((filled as any)[lng] || "").replace(/\s+/g, " ");
    if (opts?.trim !== false) v = v.trim();
    if (opts?.lowercase) v = v.toLowerCase();
    (out as any)[lng] = v;
  }
  return out;
};

/** Yazım/boşluk düzeltmeleri — dil agnostik, tip güvenli */
export function fixCommonTyposLabel(label: TranslatedLabel): TranslatedLabel {
  const out = { ...label };
  for (const lng of SUPPORTED_LOCALES) {
    let v = String((out as any)[lng] || "");
    v = v.replace(/\s{2,}/g, " ").replace(/ ?– ?/g, " - ").trim();
    (out as any)[lng] = v;
  }
  return out;
}

/** Cümle sonu noktalaması yoksa ekle (dil bazlı) */
export function punctuateLabel(label: TranslatedLabel): TranslatedLabel {
  const out = { ...label };
  for (const lng of SUPPORTED_LOCALES) {
    let v = String((out as any)[lng] || "").trim();
    if (!v) continue;
    const hasEnd = /[.!?…。؟]|।\s*$/.test(v);
    if (!hasEnd) {
      const end =
        lng === "zh" ? "。" :
        lng === "hi" ? "।" :
        lng === "ar" ? "." :
        ".";
      v = v + end;
    }
    (out as any)[lng] = v;
  }
  return out;
}
