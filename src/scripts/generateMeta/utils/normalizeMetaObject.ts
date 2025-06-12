// src/scripts/generateMeta/utils/normalizeMetaObject.ts
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

interface NormalizedMeta {
  name: string;
  label: Record<SupportedLocale, string>;
  icon: string;
  roles: string[];
  useAnalytics: boolean;
  language: SupportedLocale;
  [key: string]: any;
}

/**
 * Eksik alanları tamamlar, mevcutları override etmez.
 * @param meta Ham meta objesi
 * @returns normalize edilmiş meta
 */
export function normalizeMetaObject(meta: any): NormalizedMeta {
  const name = meta?.name?.trim?.() || "module";
  const normalized: NormalizedMeta = {
    ...meta,
    name,
    label:
      meta.label && typeof meta.label === "object"
        ? { ...fillAllLocales(name), ...meta.label } // varsa korunur, yoksa tamamlanır
        : fillAllLocales(name),
    icon: meta.icon || "box",
    roles:
      Array.isArray(meta.roles) && meta.roles.length > 0
        ? meta.roles
        : ["admin"],
    useAnalytics:
      typeof meta.useAnalytics === "boolean" ? meta.useAnalytics : false,
    language: SUPPORTED_LOCALES.includes(meta.language) ? meta.language : "en",
  };

  return normalized;
}
