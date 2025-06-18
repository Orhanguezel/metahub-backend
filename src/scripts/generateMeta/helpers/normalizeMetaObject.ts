// src/scripts/generateMeta/utils/normalizeMetaObject.ts

import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// **Eksik tip tanımını ekle!**
export type NormalizedMeta = {
  name: string;
  label: Record<SupportedLocale, string>;
  icon: string;
  roles: string[];
  useAnalytics: boolean;
  language: SupportedLocale;
  [key: string]: any;
};

/**
 * Eksik alanları tamamlar, mevcutları override etmez.
 * Tüm label alanı ve çoklu dil alanları normalize edilir.
 * Hatalı/eksik veri logger ile tenant context'iyle raporlanır.
 *
 * @param meta - Ham meta objesi
 * @param tenant - (opsiyonel) tenant ismi, log context için
 * @returns normalize edilmiş meta
 */
export function normalizeMetaObject(
  meta: any,
  tenant?: string
): NormalizedMeta {
  const name = meta?.name?.trim?.() || "module";
  const lang: SupportedLocale = getLogLocale();

  let label: Record<SupportedLocale, string>;
  try {
    if (meta.label && typeof meta.label === "object") {
      // Mevcut label'ı koru, eksik dilleri tamamla
      label = { ...fillAllLocales(name), ...meta.label };
    } else {
      label = fillAllLocales(name);
    }
  } catch (err) {
    // Kötü bir case yakalanırsa logla, fallback'e dön
    logger.error(
      t("meta.normalize.labelError", lang, translations, { module: name }),
      {
        tenant,
        module: "meta",
        event: "meta.normalize.labelError",
        status: "fail",
        name,
        error: err,
      }
    );
    label = fillAllLocales(name);
  }

  // Varsayılan rolleri güvenli şekilde belirle
  const roles =
    Array.isArray(meta.roles) && meta.roles.length > 0 ? meta.roles : ["admin"];

  const normalized: NormalizedMeta = {
    ...meta,
    name,
    label,
    icon: meta.icon || "box",
    roles,
    useAnalytics:
      typeof meta.useAnalytics === "boolean" ? meta.useAnalytics : false,
    language: SUPPORTED_LOCALES.includes(meta.language) ? meta.language : "en",
  };

  // (Opsiyonel) - Dilersen burada da eksik field/hatalı veri için uyarı logu atabilirsin
  if (!meta.icon) {
    logger.warn(
      t("meta.normalize.iconDefault", lang, translations, { module: name }),
      {
        tenant,
        module: "meta",
        event: "meta.normalize.iconDefault",
        status: "warning",
        name,
      }
    );
  }

  return normalized;
}
