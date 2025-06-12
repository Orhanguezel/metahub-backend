// src/scripts/generateMeta/utils/fixMissingModuleSettings.ts

import { ModuleMeta, ModuleSetting } from "@/modules/admin";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

// Proje adı ve ortam için otomatik fallback
const PROJECT_ENV = process.env.APP_ENV || "metahub";
const lang: SupportedLocale = (process.env.LANG as SupportedLocale) || "en";

// Default label üreten fonksiyon
const getDefaultLabel = (name: string) =>
  SUPPORTED_LOCALES.reduce(
    (acc, l) => ({ ...acc, [l]: name.charAt(0).toUpperCase() + name.slice(1) }),
    {} as Record<SupportedLocale, string>
  );

export const fixMissingModuleSettings = async () => {
  // 1. Tüm meta'ları çek
  const allMeta = await ModuleMeta.find({});
  // 2. Her bir meta için setting var mı kontrol et
  let fixedCount = 0;
  for (const meta of allMeta) {
    const existing = await ModuleSetting.findOne({
      project: PROJECT_ENV,
      module: meta.name,
    });

    if (!existing) {
      // Eksikse otomatik oluştur
      const newSetting = {
        project: PROJECT_ENV,
        module: meta.name,
        enabled: meta.enabled ?? true,
        visibleInSidebar: meta.visibleInSidebar ?? true,
        useAnalytics: meta.useAnalytics ?? false,
        roles: meta.roles ?? ["admin"],
        icon: meta.icon ?? "box",
        label:
          typeof meta.label === "object"
            ? meta.label
            : getDefaultLabel(meta.name),
        language: meta.language ?? "en",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await ModuleSetting.create(newSetting);
      fixedCount++;
      logger.info(
        t("meta.fix.setting.created", lang, translations, {
          module: meta.name,
          project: PROJECT_ENV,
        })
      );
    }
  }
  if (fixedCount) {
    logger.info(
      t("meta.fix.setting.completed", lang, translations, { count: fixedCount })
    );
    // Terminal mesajı da yaz
    console.log(`[Meta] ${fixedCount} eksik setting otomatik eklendi.`);
  } else {
    logger.info(t("meta.fix.setting.noMissing", lang, translations));
    console.log(`[Meta] Eksik setting bulunamadı, tüm modüller tamam.`);
  }
};
